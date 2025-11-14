<?php
// --- 1. Configuración de la Base de Datos (PostgreSQL) ---
$servidor = "localhost";
$puerto = "5432";
$base_datos = "acomtus";
$usuario = "postgres";
$password = "Orellana"; // ¡CAMBIA ESTO!

// --- 2. Establecer encabezados ---
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido.']);
    exit;
}

// --- 3. Leer los datos JSON ---
$datos_json = file_get_contents('php://input');
$datos = json_decode($datos_json, true);

// 4. Validar datos (¡MODIFICADO!)
// Ahora también validamos que llegue 'distancia_km'
if (!isset($datos['ruta_id']) || !isset($datos['coordenadas']) || !isset($datos['distancia_km'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Datos incompletos. Se esperaba ruta_id, coordenadas y distancia_km.']);
    exit;
}

// ¡MODIFICADO! Obtener la nueva variable
$ruta_id = $datos['ruta_id'];
$coordenadas = $datos['coordenadas'];
$distancia_km = $datos['distancia_km']; // <-- ¡NUEVA VARIABLE!

// --- 5. Conexión a la Base de Datos ---
try {
    $conexion_dsn = "pgsql:host=$servidor;port=$puerto;dbname=$base_datos";
    $conexion = new PDO($conexion_dsn, $usuario, $password);
    $conexion->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error de conexión a la BD: ' . $e->getMessage()]);
    exit;
}

// --- 6. Transacción (¡MODIFICADO!) ---
try {
    $conexion->beginTransaction();

    // -- Paso A: Borrar coordenadas antiguas (igual que antes) --
    $sql_delete = "DELETE FROM trazado_ruta WHERE ruta_id = :ruta_id";
    $stmt_delete = $conexion->prepare($sql_delete);
    $stmt_delete->bindParam(':ruta_id', $ruta_id, PDO::PARAM_INT);
    $stmt_delete->execute();

    // -- Paso B: ¡NUEVO! Actualizar la distancia en la tabla 'catalogo_ruta' --
    $sql_update = "UPDATE catalogo_ruta 
                   SET distancia_km = :distancia 
                   WHERE id_ruta = :ruta_id";
    $stmt_update = $conexion->prepare($sql_update);
    $stmt_update->bindParam(':distancia', $distancia_km);
    $stmt_update->bindParam(':ruta_id', $ruta_id, PDO::PARAM_INT);
    $stmt_update->execute();


    // -- Paso C: Insertar coordenadas nuevas (igual que antes) --
    $sql_insert = "INSERT INTO trazado_ruta (ruta_id, latitud, longitud, orden) 
                   VALUES (:ruta_id, :latitud, :longitud, :orden)";
    $stmt_insert = $conexion->prepare($sql_insert);
    
    $orden = 1;
    foreach ($coordenadas as $coord) {
        $lat = $coord[0];
        $lng = $coord[1];
        $stmt_insert->bindParam(':ruta_id', $ruta_id, PDO::PARAM_INT);
        $stmt_insert->bindParam(':latitud', $lat);
        $stmt_insert->bindParam(':longitud', $lng);
        $stmt_insert->bindParam(':orden', $orden, PDO::PARAM_INT);
        $stmt_insert->execute();
        $orden++;
    }

    // -- Paso D: Confirmar los cambios --
    $conexion->commit();
    
    // 7. Enviar respuesta de éxito (¡MODIFICADO!)
    $num_puntos = $orden - 1;
    echo json_encode([
        'success' => true, 
        'message' => "¡Éxito! Trazado guardado con $num_puntos puntos y distancia actualizada a $distancia_km km."
    ]);

} catch (Exception $e) {
    // -- Paso E: Si algo falló, deshacer cambios --
    $conexion->rollBack();
    
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error al guardar la ruta: ' . $e->getMessage()]);
}

?>