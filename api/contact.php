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

// Anti-spam checks
// 1. Honeypot field - should be empty (bots fill hidden fields)
if (!empty($data['website'])) {
    logSpam('honeypot', $data);
    echo json_encode(['success' => true, 'message' => 'Vielen Dank! Ihre Nachricht wurde gesendet.']);
    exit;
}

// 2. Time-based check - form should take at least 5 seconds to fill
$timestamp = intval($data['_timestamp'] ?? 0);
if ($timestamp > 0) {
    $timeDiff = (time() * 1000) - $timestamp;
    if ($timeDiff < 5000) {
        logSpam('too_fast', $data);
        echo json_encode(['success' => true, 'message' => 'Vielen Dank! Ihre Nachricht wurde gesendet.']);
        exit;
    }
}

// 3. Heuristic content check - catches random-string bot submissions
$spamReason = detectSpamContent($data);
if ($spamReason !== null) {
    logSpam($spamReason, $data);
    echo json_encode(['success' => true, 'message' => 'Vielen Dank! Ihre Nachricht wurde gesendet.']);
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

/**
 * Heuristic spam detection for random-string bot submissions.
 * Returns a short reason string if the submission looks like spam, null otherwise.
 */
function detectSpamContent($data) {
    $firstName = trim((string)($data['firstName'] ?? ''));
    $lastName  = trim((string)($data['lastName']  ?? ''));
    $company   = trim((string)($data['company']   ?? ''));
    $message   = trim((string)($data['message']   ?? ''));
    $email     = trim((string)($data['email']     ?? ''));

    // Names must not contain digits or symbols typical of generated strings
    if (preg_match('/[\d@\/\\\\<>{}\[\]|]/u', $firstName . $lastName)) {
        return 'name_has_symbols';
    }

    // Each text field: check for gibberish-style "words"
    foreach (['firstName' => $firstName, 'lastName' => $lastName, 'company' => $company, 'message' => $message] as $key => $text) {
        if ($text === '') continue;
        if (looksLikeGibberish($text)) {
            return 'gibberish_' . $key;
        }
    }

    // Message-specific: a real message of length >= 12 will almost always contain a space
    if (mb_strlen($message) >= 12 && strpos($message, ' ') === false) {
        return 'message_no_space';
    }

    // Email: Gmail dots trick (e.g. "i.ki.so.yiy.i.t.i.45@gmail.com") — 4+ dots in localpart is abusive
    if (preg_match('/^([^@]+)@/', $email, $m)) {
        $local = $m[1];
        if (substr_count($local, '.') >= 4) {
            return 'email_dot_trick';
        }
    }

    return null;
}

/**
 * Returns true if the given text contains at least one "word" that looks
 * like a random character string rather than natural language.
 *
 * Triggers used:
 *  - 4+ uppercase letters scattered through a word of length >= 8 (catches
 *    random mixed-case bot output, allows CamelCase brand names like
 *    "TaskLensPro" which have at most 3 uppercase letters)
 *  - Vowel ratio outside natural range in a word of length >= 10 (catches
 *    pure-lowercase consonant strings)
 */
function looksLikeGibberish($text) {
    $tokens = preg_split('/\s+/u', $text) ?: [];
    foreach ($tokens as $token) {
        // Strip everything except letters (incl. German umlauts)
        $word = preg_replace('/[^a-zA-ZäöüÄÖÜß]/u', '', $token);
        $len  = mb_strlen($word);
        if ($len < 8) continue;

        $upper = preg_match_all('/[A-ZÄÖÜ]/u', $word);
        $lower = preg_match_all('/[a-zäöüß]/u', $word);
        $total = $upper + $lower;
        if ($total === 0) continue;

        // Scattered uppercase letters (not just at start, not all-caps acronym)
        if ($upper >= 4) {
            $upperPositions = [];
            for ($i = 0; $i < $len; $i++) {
                if (preg_match('/[A-ZÄÖÜ]/u', mb_substr($word, $i, 1))) {
                    $upperPositions[] = $i;
                }
            }
            $upperRatio = $upper / $total;
            if ($upperRatio < 0.9 && end($upperPositions) > 2) {
                return true;
            }
        }

        // Vowel ratio outside natural range (German averages ~0.38)
        if ($len >= 10) {
            $vowels = preg_match_all('/[aeiouäöüAEIOUÄÖÜ]/u', $word);
            $ratio  = $vowels / $total;
            if ($ratio < 0.15 || $ratio > 0.75) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Log blocked submission to api/spam.log for monitoring. Silent on failure.
 */
function logSpam($reason, $data) {
    $line = sprintf(
        "[%s] %s | ip=%s | name=%s %s | email=%s | company=%s | msg=%s\n",
        date('Y-m-d H:i:s'),
        $reason,
        $_SERVER['REMOTE_ADDR'] ?? '?',
        substr((string)($data['firstName'] ?? ''), 0, 60),
        substr((string)($data['lastName']  ?? ''), 0, 60),
        substr((string)($data['email']     ?? ''), 0, 120),
        substr((string)($data['company']   ?? ''), 0, 80),
        substr(str_replace(["\n", "\r"], ' ', (string)($data['message'] ?? '')), 0, 200)
    );
    @file_put_contents(__DIR__ . '/spam.log', $line, FILE_APPEND | LOCK_EX);
}
