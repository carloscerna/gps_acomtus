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
// 1. Leer JSON
$datos = json_decode(file_get_contents('php://input'), true);

// 2. Validar datos (¡AHORA PEDIMOS EL ID DEL TRANSPORTE!)
if (!isset($datos['id_transporte']) || !isset($datos['ruta_id']) || !isset($datos['lat']) || !isset($datos['lng'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Faltan datos: id_transporte, ruta_id, lat, lng']);
    exit;
}
// ID del transporte y otros datos ya validados...
$id_transporte = $datos['id_transporte'];
$ruta_id = $datos['ruta_id'];
$lat = $datos['lat'];
$lng = $datos['lng'];
// Si tu app manda velocidad, úsala. Si no, 0.
$velocidad = isset($datos['speed']) ? $datos['speed'] : 0; 

try {
    // Iniciar transacción (para asegurar que se guarde en las dos o en ninguna)
    $conexion->beginTransaction();

    // --- 1. ACTUALIZAR TABLA EN VIVO (Esto ya lo tienes) ---
    $sql_vivo = "INSERT INTO ubicacion_en_vivo (id_transporte, ruta_id, latitud, longitud, ultima_actualizacion) 
            VALUES (:id_transporte, :ruta_id, :lat, :lng, NOW())
            ON CONFLICT (id_transporte) 
            DO UPDATE SET 
                ruta_id = EXCLUDED.ruta_id,
                latitud = EXCLUDED.latitud, 
                longitud = EXCLUDED.longitud, 
                ultima_actualizacion = NOW()";
    
    $stmt = $conexion->prepare($sql_vivo);
    $stmt->bindParam(':id_transporte', $id_transporte);
    $stmt->bindParam(':ruta_id', $ruta_id);
    $stmt->bindParam(':lat', $lat);
    $stmt->bindParam(':lng', $lng);
    $stmt->execute();

    // --- 2. INSERTAR EN HISTORIAL (¡LO NUEVO!) ---
    // Solo insertamos. Nunca borramos ni actualizamos aquí.
    $sql_historia = "INSERT INTO historial_ubicaciones 
                     (id_transporte, ruta_id, latitud, longitud, velocidad, fecha_hora) 
                     VALUES (:id_transporte, :ruta_id, :lat, :lng, :vel, NOW())";
    
    $stmt2 = $conexion->prepare($sql_historia);
    $stmt2->bindParam(':id_transporte', $id_transporte);
    $stmt2->bindParam(':ruta_id', $ruta_id);
    $stmt2->bindParam(':lat', $lat);
    $stmt2->bindParam(':lng', $lng);
    $stmt2->bindParam(':vel', $velocidad);
    $stmt2->execute();

    // Confirmar ambas operaciones
    $conexion->commit();

    echo json_encode(['success' => true]);

} catch (Exception $e) {
    $conexion->rollBack(); // Si falla algo, deshacer todo
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>