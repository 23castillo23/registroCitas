<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'db.php';

try {
    $stmt = $pdo->prepare("SELECT id, nombre, curp, tramite, datetime FROM citas ORDER BY datetime ASC");
    $stmt->execute();
    $rows = $stmt->fetchAll();

    $events = array_map(function($r){
        return [
            'id' => $r['id'],
            'title' => $r['tramite'],
            'start' => date('Y-m-d H:i:00', strtotime($r['datetime'])),
            'extendedProps' => [
                'nombre' => $r['nombre'],
                'curp' => $r['curp']
            ]
        ];
    }, $rows);

    echo json_encode($events);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success'=>false,'message'=>$e->getMessage()]);
}
?>
