<?php
/**
 * Contact Form API Endpoint
 * Handles form submissions, sends email notifications, and creates HubSpot contacts/deals
 */

// Load configuration if exists
if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
}

// Configuration - Set via environment variables or config.php
define('HUBSPOT_ACCESS_TOKEN', getenv('HUBSPOT_ACCESS_TOKEN') ?: '');
define('CONTACT_EMAIL', 'othmar@fetz.cc');
define('HUBSPOT_PIPELINE', 'default');
define('HUBSPOT_DEALSTAGE', '5099605239');
define('HUBSPOT_MARKE', 'FETZ');

// CORS and content type headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

// Get JSON input
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid JSON data']);
    exit;
}

// Validate required fields
$required = ['firstName', 'lastName', 'email', 'message'];
$errors = [];

foreach ($required as $field) {
    if (empty($data[$field])) {
        $errors[] = "Field '$field' is required";
    }
}

if (!filter_var($data['email'] ?? '', FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'Invalid email address';
}

if (!empty($errors)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => implode(', ', $errors)]);
    exit;
}

// Sanitize input
$firstName = htmlspecialchars(trim($data['firstName']), ENT_QUOTES, 'UTF-8');
$lastName = htmlspecialchars(trim($data['lastName']), ENT_QUOTES, 'UTF-8');
$company = htmlspecialchars(trim($data['company'] ?? ''), ENT_QUOTES, 'UTF-8');
$email = filter_var(trim($data['email']), FILTER_SANITIZE_EMAIL);
$message = htmlspecialchars(trim($data['message']), ENT_QUOTES, 'UTF-8');
$fullName = "$firstName $lastName";

// Send email notification
$emailSent = sendEmailNotification($firstName, $lastName, $company, $email, $message);

// Create HubSpot contact and deal
$hubspotResult = createHubSpotContactAndDeal($firstName, $lastName, $company, $email, $message);

// Response
if ($emailSent) {
    echo json_encode([
        'success' => true,
        'message' => 'Vielen Dank! Ihre Nachricht wurde gesendet.',
        'hubspot' => $hubspotResult
    ]);
} else {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'E-Mail konnte nicht gesendet werden. Bitte versuchen Sie es später erneut.'
    ]);
}

/**
 * Send email notification
 */
function sendEmailNotification($firstName, $lastName, $company, $email, $message) {
    $fullName = "$firstName $lastName";
    $subject = "Neue Anfrage von $fullName - fetz.cc";

    $body = "
    <html>
    <head>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
            .label { color: #666; font-size: 12px; text-transform: uppercase; margin-bottom: 4px; }
            .value { margin-bottom: 16px; }
        </style>
    </head>
    <body>
        <h2>Neue Kontaktanfrage</h2>
        <p class='label'>Name</p>
        <p class='value'>$fullName</p>
        " . ($company ? "<p class='label'>Unternehmen</p><p class='value'>$company</p>" : "") . "
        <p class='label'>E-Mail</p>
        <p class='value'><a href='mailto:$email'>$email</a></p>
        <p class='label'>Nachricht</p>
        <p class='value'>" . nl2br($message) . "</p>
        <hr style='margin: 24px 0; border: none; border-top: 1px solid #eee;'>
        <p style='font-size: 12px; color: #999;'>Gesendet über fetz.cc Kontaktformular</p>
    </body>
    </html>
    ";

    $headers = [
        'MIME-Version: 1.0',
        'Content-type: text/html; charset=UTF-8',
        'From: fetz.cc <noreply@fetz.cc>',
        "Reply-To: $fullName <$email>",
        'X-Mailer: PHP/' . phpversion()
    ];

    return mail(CONTACT_EMAIL, $subject, $body, implode("\r\n", $headers));
}

/**
 * Create HubSpot contact and deal
 */
function createHubSpotContactAndDeal($firstName, $lastName, $company, $email, $message) {
    if (empty(HUBSPOT_ACCESS_TOKEN)) {
        return ['error' => 'HubSpot not configured'];
    }

    $result = ['contact' => null, 'deal' => null, 'errors' => []];
    $fullName = "$firstName $lastName";

    // Check if contact exists
    $existingContact = searchHubSpotContact($email);
    $contactId = null;

    if ($existingContact) {
        $contactId = $existingContact;
        // Update existing contact
        $updateResult = updateHubSpotContact($contactId, [
            'company' => $company,
            'lastname' => $lastName,
            'firstname' => $firstName
        ]);
        $result['contact'] = ['id' => $contactId, 'action' => 'updated'];
    } else {
        // Create new contact
        $contactData = [
            'properties' => [
                'email' => $email,
                'firstname' => $firstName,
                'lastname' => $lastName,
                'company' => $company,
                'message' => $message,
                'hs_lead_status' => 'NEW',
                'lifecyclestage' => 'lead'
            ]
        ];

        $contactResponse = hubspotRequest('POST', 'crm/v3/objects/contacts', $contactData);

        if (isset($contactResponse['id'])) {
            $contactId = $contactResponse['id'];
            $result['contact'] = ['id' => $contactId, 'action' => 'created'];
        } else {
            $result['errors'][] = 'Contact creation failed: ' . json_encode($contactResponse);
        }
    }

    // Create deal
    if ($contactId) {
        $today = date('Y-m-d');
        $dealData = [
            'properties' => [
                'dealname' => "$fullName - Anfrage fetz.cc",
                'dealstage' => HUBSPOT_DEALSTAGE,
                'pipeline' => HUBSPOT_PIPELINE,
                'description' => $message,
                'closedate' => $today,
                'marke' => HUBSPOT_MARKE
            ]
        ];

        $dealResponse = hubspotRequest('POST', 'crm/v3/objects/deals', $dealData);

        if (isset($dealResponse['id'])) {
            $dealId = $dealResponse['id'];
            $result['deal'] = ['id' => $dealId];

            // Associate deal with contact
            $assocResponse = hubspotRequest(
                'PUT',
                "crm/v3/objects/deals/$dealId/associations/contacts/$contactId/deal_to_contact",
                null
            );

            if (isset($assocResponse['error'])) {
                $result['errors'][] = 'Association failed: ' . json_encode($assocResponse);
            }
        } else {
            $result['errors'][] = 'Deal creation failed: ' . json_encode($dealResponse);
        }
    }

    return $result;
}

/**
 * Search for existing HubSpot contact by email
 */
function searchHubSpotContact($email) {
    $searchData = [
        'filterGroups' => [[
            'filters' => [[
                'propertyName' => 'email',
                'operator' => 'EQ',
                'value' => $email
            ]]
        ]]
    ];

    $response = hubspotRequest('POST', 'crm/v3/objects/contacts/search', $searchData);

    if (isset($response['total']) && $response['total'] > 0) {
        return $response['results'][0]['id'];
    }

    return null;
}

/**
 * Update HubSpot contact
 */
function updateHubSpotContact($contactId, $properties) {
    return hubspotRequest('PATCH', "crm/v3/objects/contacts/$contactId", [
        'properties' => $properties
    ]);
}

/**
 * Make HubSpot API request
 */
function hubspotRequest($method, $endpoint, $data = null) {
    $url = "https://api.hubapi.com/$endpoint";

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . HUBSPOT_ACCESS_TOKEN,
        'Content-Type: application/json'
    ]);

    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        if ($data) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }
    } elseif ($method === 'PATCH') {
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PATCH');
        if ($data) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }
    } elseif ($method === 'PUT') {
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
    }

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        return ['error' => $error];
    }

    $decoded = json_decode($response, true);

    if ($httpCode >= 400) {
        return ['error' => $decoded['message'] ?? 'Unknown error', 'status' => $httpCode];
    }

    return $decoded ?: [];
}
