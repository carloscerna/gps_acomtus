<?php
// --- Configuración y Conexión (Igual que el otro script) ---
$servidor = "localhost"; $puerto = "5432"; $base_datos = "acomtus";
$usuario = "postgres"; $password = "Orellana";
header('Content-Type: application/json');
try {
    $conexion_dsn = "pgsql:host=$servidor;port=$puerto;dbname=$base_datos";
    $conexion = new PDO($conexion_dsn, $usuario, $password);
    $conexion->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) { /* ... manejo de error ... */ exit; }

// --- Lógica de la API ---
// Busca todos los buses que se hayan actualizado en los últimos 5 minutos
$sql = "SELECT r.descripcion, u.ruta_id, u.latitud, u.longitud 
        FROM ubicacion_en_vivo u
        JOIN catalogo_ruta r ON u.ruta_id = r.id_ruta
        WHERE ultima_actualizacion > NOW() - INTERVAL '5 minute'";

$stmt = $conexion->prepare($sql);
$stmt->execute();
$buses_en_vivo = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode($buses_en_vivo);
?>