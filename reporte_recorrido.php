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

// Cargar variables para Twig (Esto lo copias de tus otros archivos)
$variables_twig = [
    'logo_uno' => $_SESSION['logo_uno'],
    'nombre_institucion' => $_SESSION['nombre_institucion'],
    'foto_personal' => $_SESSION['foto_personal'],
    'nombre_perfil' => $_SESSION['nombre_perfil'],
    'nombre_personal' => $_SESSION['nombre_personal'],
    'codigo_perfil' => $_SESSION['codigo_perfil']
];

// Renderizar la vista
// Asumiendo que usas $twig global o lo instancias aquí
echo $twig->render('reporte_recorrido.twig', $variables_twig);
?>