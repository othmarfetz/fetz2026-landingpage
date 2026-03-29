<?php
/**
 * Configuration for Contact API
 *
 * SETUP INSTRUCTIONS:
 * 1. Copy this file to config.php on the server:
 *    cp config.example.php config.php
 *
 * 2. Replace YOUR_HUBSPOT_ACCESS_TOKEN_HERE with your actual token
 *
 * 3. Get your HubSpot Private App Access Token:
 *    - Go to HubSpot > Settings > Integrations > Private Apps
 *    - Create a new private app or use an existing one
 *    - Required scopes: crm.objects.contacts.write, crm.objects.deals.write
 *
 * IMPORTANT: Never commit config.php to git!
 */

// HubSpot Private App Access Token
putenv('HUBSPOT_ACCESS_TOKEN=YOUR_HUBSPOT_ACCESS_TOKEN_HERE');
