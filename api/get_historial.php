<?php
// 1. Configuración de la Base de Datos
$servidor = "localhost";
$puerto = "5432";
$base_datos = "acomtus";
$usuario = "postgres";
$password = "Orellana"; // Tu contraseña

header('Content-Type: application/json');

// 2. Crear la conexión (ESTO ES LO QUE FALTABA)
try {
    $conexion_dsn = "pgsql:host=$servidor;port=$puerto;dbname=$base_datos";
    $conexion = new PDO($conexion_dsn, $usuario, $password);
    $conexion->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error de conexión a la BD: ' . $e->getMessage()]);
    exit;
}

// 3. Validar parámetros
if (!isset($_GET['id_transporte']) || !isset($_GET['fecha_inicio']) || !isset($_GET['fecha_fin'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Faltan parametros (id_transporte, fecha_inicio, fecha_fin)']);
    exit;
}

$id = $_GET['id_transporte'];
$inicio = $_GET['fecha_inicio']; // El formato 2025-11-21T00:00 funciona bien en Postgres
$fin = $_GET['fecha_fin'];

try {
    // 4. Consulta SQL
    // Seleccionamos los puntos ordenados cronológicamente
    $sql = "SELECT latitud, longitud, fecha_hora, velocidad 
            FROM historial_ubicaciones 
            WHERE id_transporte = :id 
            AND fecha_hora BETWEEN :inicio AND :fin
            ORDER BY fecha_hora ASC";

    $stmt = $conexion->prepare($sql); // Aquí es donde daba el error antes
    $stmt->bindParam(':id', $id);
    $stmt->bindParam(':inicio', $inicio);
    $stmt->bindParam(':fin', $fin);
    $stmt->execute();
    
    $puntos = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode($puntos);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error SQL: ' . $e->getMessage()]);
}
?>