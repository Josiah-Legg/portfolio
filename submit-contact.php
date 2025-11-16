<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

$name = isset($_POST['name']) ? trim($_POST['name']) : '';
$email = isset($_POST['email']) ? trim($_POST['email']) : '';
$message = isset($_POST['message']) ? trim($_POST['message']) : '';
$turnstileToken = isset($_POST['cf-turnstile-response']) ? $_POST['cf-turnstile-response'] : '';

if (empty($name) || empty($email) || empty($message)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'All fields are required']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid email address']);
    exit;
}

if (empty($turnstileToken)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Please complete the verification']);
    exit;
}

$turnstileSecret = '0x4AAAAAACBJLk0ZQ06KSs055oH3QFb1Arg';

$verifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
$verifyData = [
    'secret' => $turnstileSecret,
    'response' => $turnstileToken,
    'remoteip' => $_SERVER['REMOTE_ADDR']
];

$ch = curl_init($verifyUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($verifyData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$verifyResponse = curl_exec($ch);
curl_close($ch);

$verifyResult = json_decode($verifyResponse, true);

if (!$verifyResult['success']) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Verification failed. Please try again.']);
    exit;
}

$to = 'contact@josiahlegg.com';
$subject = 'New Contact Form Submission from ' . $name;
$headers = "From: noreply@josiahlegg.com\r\n";
$headers .= "Reply-To: " . $email . "\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

$emailBody = "Name: $name\n";
$emailBody .= "Email: $email\n";
$emailBody .= "Message:\n$message\n";

if (mail($to, $subject, $emailBody, $headers)) {
    echo json_encode(['success' => true, 'message' => 'Message sent successfully!']);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Failed to send message. Please try again.']);
}
?>