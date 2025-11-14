<?php
// --- 1. Configuración de la Base de Datos (PostgreSQL) ---
$servidor = "localhost";
$puerto = "5432";
$base_datos = "acomtus"; // Tu base de datos
$usuario = "postgres";
$password = "Orellana"; // ¡CAMBIA ESTO!

header('Content-Type: application/json');

// --- 2. Validar que nos den un ID ---
if (!isset($_GET['id'])) {
    http_response_code(400); // Bad Request
    echo json_encode(['error' => 'No se especificó un ID de ruta.']);
    exit;
}
$ruta_id = $_GET['id'];

// --- 3. Conexión ---
try {
    $conexion_dsn = "pgsql:host=$servidor;port=$puerto;dbname=$base_datos";
    $conexion = new PDO($conexion_dsn, $usuario, $password);
    $conexion->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error de conexión a la BD: ' . $e->getMessage()]);
    exit;
}

// --- 4. Lógica de la API ---
// Buscamos en 'trazado_ruta' y ordenamos por 'orden'
$sql = "SELECT latitud, longitud 
        FROM trazado_ruta 
        WHERE ruta_id = :id 
        ORDER BY orden ASC"; // El orden es crucial

$stmt = $conexion->prepare($sql);
$stmt->bindParam(':id', $ruta_id, PDO::PARAM_INT);
$stmt->execute();

// 5. Obtener los resultados
$coordenadas_raw = $stmt->fetchAll(PDO::FETCH_ASSOC);

// 6. Formatear la salida para que Leaflet la entienda
// Leaflet espera [latitud, longitud]
$trazado_formateado = [];
foreach ($coordenadas_raw as $coord) {
    // Convertimos de string a float (número decimal)
    $trazado_formateado[] = [
        (float)$coord['latitud'], 
        (float)$coord['longitud']
    ];
}

// 7. Devolver los resultados como JSON
echo json_encode($trazado_formateado);
?>