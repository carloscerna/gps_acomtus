<?php
// --- Configuración y Conexión ---
$servidor = "localhost";
$puerto = "5432";
$base_datos = "acomtus";
$usuario = "postgres";
$password = "Orellana"; // Tu contraseña real

header('Content-Type: application/json');

try {
    $conexion_dsn = "pgsql:host=$servidor;port=$puerto;dbname=$base_datos";
    $conexion = new PDO($conexion_dsn, $usuario, $password);
    $conexion->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error conexion: ' . $e->getMessage()]);
    exit;
}
// --- Lógica de la API ---
// Obtenemos ubicación + nombre de ruta + NUMERO DE EQUIPO
$sql = "SELECT 
            u.id_transporte, 
            u.latitud, 
            u.longitud, 
            r.descripcion as nombre_ruta,
            t.numero_equipo,    -- ¡Aquí está el número para el ícono! (Ej: 10)
            t.descripcion as nombre_unidad -- (Ej: Unidad N.º 10)
        FROM ubicacion_en_vivo u
        JOIN catalogo_ruta r ON u.ruta_id = r.id_ruta
        JOIN transporte_colectivo t ON u.ruta_id = t.id_
        WHERE u.ultima_actualizacion > NOW() - INTERVAL '5 minute'";

$stmt = $conexion->prepare($sql);
$stmt->execute();
$buses = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode($buses);
?>