<?php
// --- 1. Configuración de la Base de Datos (PostgreSQL) ---
$servidor = "localhost";
$puerto = "5432";
$base_datos = "acomtus";
$usuario = "postgres";
$password = "Orellana"; // ¡CAMBIA ESTO!

header('Content-Type: application/json');

// --- 2. Solo aceptar método POST ---
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido.']);
    exit;
}

// --- 3. Leer los datos JSON que envía el celular ---
$datos = json_decode(file_get_contents('php://input'), true);

// 4. Validar datos
if (!isset($datos['ruta_id']) || !isset($datos['lat']) || !isset($datos['lng'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Datos incompletos. Se esperaba ruta_id, lat y lng.']);
    exit;
}

$ruta_id = $datos['ruta_id'];
$latitud = $datos['lat'];
$longitud = $datos['lng'];

// --- 5. Conexión a la Base de Datos ---
try {
    $conexion_dsn = "pgsql:host=$servidor;port=$puerto;dbname=$base_datos";
    $conexion = new PDO($conexion_dsn, $usuario, $password);
    $conexion->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error de conexión a la BD.']);
    exit;
}

// --- 6. Guardar la ubicación (Lógica "UPSERT") ---
// Intenta INSERTAR. Si la 'ruta_id' ya existe (ON CONFLICT), 
// entonces actualiza (DO UPDATE) la lat, lng y la hora.
$sql = "INSERT INTO ubicacion_en_vivo (ruta_id, latitud, longitud, ultima_actualizacion) 
        VALUES (:ruta_id, :lat, :lng, NOW())
        ON CONFLICT (ruta_id) 
        DO UPDATE SET 
            latitud = EXCLUDED.latitud, 
            longitud = EXCLUDED.longitud, 
            ultima_actualizacion = NOW()";

try {
    $stmt = $conexion->prepare($sql);
    $stmt->bindParam(':ruta_id', $ruta_id, PDO::PARAM_INT);
    $stmt->bindParam(':lat', $latitud);
    $stmt->bindParam(':lng', $longitud);
    $stmt->execute();

    echo json_encode(['success' => true, 'message' => 'Ubicación actualizada.']);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error al guardar en BD: ' . $e->getMessage()]);
}
?>