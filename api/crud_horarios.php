<?php
// --- 1. Configuración de la Base de Datos (PostgreSQL) ---
$servidor = "localhost";
$puerto = "5432";
$base_datos = "acomtus";
$usuario = "postgres";
$password = "Orellana"; // ¡CAMBIA ESTO!

header('Content-Type: application/json');

// --- 2. Conexión a la Base de Datos ---
try {
    $conexion_dsn = "pgsql:host=$servidor;port=$puerto;dbname=$base_datos";
    $conexion = new PDO($conexion_dsn, $usuario, $password);
    $conexion->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Error de conexión a la BD: ' . $e->getMessage()]);
    exit;
}

// --- 3. Lógica de la API (CRUD) ---
$metodo = $_SERVER['REQUEST_METHOD'];

switch ($metodo) {
    // --- ACCIÓN: LEER (Read) ---
    case 'GET':
        // Comprobar si nos piden horarios para una ruta específica
        if (!isset($_GET['ruta_id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'No se especificó un ID de ruta.']);
            exit;
        }
        $ruta_id = $_GET['ruta_id'];

        $sql = "SELECT id, dia_semana, hora_inicio, hora_fin, frecuencia_minutos 
                FROM horarios 
                WHERE ruta_id = :ruta_id 
                ORDER BY dia_semana, hora_inicio";
        
        $stmt = $conexion->prepare($sql);
        $stmt->bindParam(':ruta_id', $ruta_id, PDO::PARAM_INT);
        $stmt->execute();
        $horarios = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode($horarios); // Devolver la lista de horarios
        break;

    // --- ACCIÓN: CREAR (Create) ---
    case 'POST':
        // Leer los datos JSON enviados desde el admin.js
        $datos = json_decode(file_get_contents('php://input'), true);

        // Validar que tengamos todos los datos
        if (!isset($datos['ruta_id']) || !isset($datos['dia_semana']) || !isset($datos['hora_inicio']) || !isset($datos['hora_fin']) || !isset($datos['frecuencia'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Datos incompletos.']);
            exit;
        }

        // Insertar los datos en la base de datos
        $sql = "INSERT INTO horarios (ruta_id, dia_semana, hora_inicio, hora_fin, frecuencia_minutos) 
                VALUES (:ruta_id, :dia_semana, :hora_inicio, :hora_fin, :frecuencia)";
        
        $stmt = $conexion->prepare($sql);
        $stmt->bindParam(':ruta_id', $datos['ruta_id'], PDO::PARAM_INT);
        $stmt->bindParam(':dia_semana', $datos['dia_semana']);
        $stmt->bindParam(':hora_inicio', $datos['hora_inicio']);
        $stmt->bindParam(':hora_fin', $datos['hora_fin']);
        $stmt->bindParam(':frecuencia', $datos['frecuencia'], PDO::PARAM_INT);
        
        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Horario guardado con éxito.']);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Error al guardar el horario.']);
        }
        break;
        
    // (Aquí podríamos añadir 'PUT' para Actualizar y 'DELETE' para Borrar más adelante)
    default:
        http_response_code(405); // Método no permitido
        echo json_encode(['success' => false, 'error' => 'Método no permitido.']);
        break;
}
?>