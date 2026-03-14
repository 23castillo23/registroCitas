<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'db.php';

$data = json_decode(file_get_contents('php://input'), true);
if (!$data) { echo json_encode(['success'=>false,'message'=>'No data']); exit; }

$id = $data['id'] ?? '';
$nombre = strtoupper(trim($data['nombre'] ?? ''));
$curp = strtoupper(trim($data['curp'] ?? ''));
$tramite = trim($data['tramite'] ?? '');
$datetime = str_replace('T',' ', $data['datetime'] ?? '');

if (!$id || !$nombre || !$curp || !$tramite || !$datetime) {
    echo json_encode(['success'=>false,'message'=>'Faltan campos']);
    exit;
}

$dt = DateTime::createFromFormat('Y-m-d H:i', $datetime);
if (!$dt) { echo json_encode(['success'=>false,'message'=>'Formato fecha inválido']); exit; }
$dtStr = $dt->format('Y-m-d H:i:00');

try {
    // Verificar si la hora ya está ocupada por otra cita
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM citas WHERE datetime = ? AND id != ?");
    $stmt->execute([$dtStr, $id]);
    if ($stmt->fetchColumn() > 0) {
        echo json_encode(['success'=>false,'message'=>'La hora seleccionada ya está ocupada']);
        exit;
    }

    $stmt = $pdo->prepare("UPDATE citas SET nombre = ?, curp = ?, tramite = ?, datetime = ? WHERE id = ?");
    $stmt->execute([$nombre, $curp, $tramite, $dtStr, $id]);
    echo json_encode(['success'=>true,'message'=>'Actualizado']);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success'=>false,'message'=>$e->getMessage()]);
}
?>
