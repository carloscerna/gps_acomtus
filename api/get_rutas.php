<?php
// --- 1. Configuración de la Base de Datos (PostgreSQL) ---
$servidor = "localhost";
$puerto = "5432";
$base_datos = "acomtus"; // Correcto
$usuario = "postgres";
$password = "Orellana"; // ¡CAMBIA ESTO!

header('Content-Type: application/json');

// --- 2. Conexión ---
try {
    $conexion_dsn = "pgsql:host=$servidor;port=$puerto;dbname=$base_datos";
    $conexion = new PDO($conexion_dsn, $usuario, $password);
    $conexion->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error de conexión a la BD: ' . $e->getMessage()]);
    exit;
}

// --- 3. Lógica de la API ---
// ¡CAMBIO IMPORTANTE!
// Seleccionamos 'id_ruta' y 'descripcion' de 'catalogo_ruta'
$sql = "SELECT id_ruta, descripcion FROM catalogo_ruta ORDER BY descripcion ASC";

$stmt = $conexion->prepare($sql);
$stmt->execute();

// 4. Obtener los resultados
// El JSON se verá así: [{"id_ruta": 1, "descripcion": "A - Aldea..."}]
$rutas = $stmt->fetchAll(PDO::FETCH_ASSOC);

// 5. Devolver los resultados como JSON
echo json_encode($rutas);
?>