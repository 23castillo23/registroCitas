<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'db.php';

$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    echo json_encode(['success'=>false,'message'=>'No se recibieron datos']);
    exit;
}

// Normalizar datos
$folio = trim($data['folio'] ?? '');
$id = $data['id'] ?? bin2hex(random_bytes(16));
$nombre = strtoupper(trim($data['nombre'] ?? ''));
$curp = strtoupper(trim($data['curp'] ?? ''));
$tramite = trim($data['tramite'] ?? '');
$datetime = $data['datetime'] ?? '';

if (!$nombre || !$curp || !$tramite || !$datetime) {
    echo json_encode(['success'=>false,'message'=>'Faltan campos obligatorios']);
    exit;
}

// Normalizar fecha a DATETIME MySQL
$datetime = str_replace('T', ' ', $datetime);
$dt = DateTime::createFromFormat('Y-m-d H:i', $datetime);
if (!$dt) {
    echo json_encode(['success'=>false,'message'=>'Formato de fecha inválido']);
    exit;
}
$dtStr = $dt->format('Y-m-d H:i:00');

try {
    // Verificar si la hora ya está ocupada
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM citas WHERE datetime = ?");
    $stmt->execute([$dtStr]);
    if ($stmt->fetchColumn() > 0) {
        echo json_encode(['success'=>false,'message'=>'La hora seleccionada ya está ocupada']);
        exit;
    }

    // Insertar cita
    if (!$folio) $folio = 'FOLIO-GEN-' . bin2hex(random_bytes(4));
    $stmt = $pdo->prepare("INSERT INTO citas (id, folio, nombre, curp, tramite, datetime) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->execute([$id, $folio, $nombre, $curp, $tramite, $dtStr]);

    echo json_encode([
        'success' => true,
        'message' => 'Cita guardada',
        'id' => $id,
        'folio' => $folio
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success'=>false,'message'=>$e->getMessage()]);
}
?>
