<?php

// -> daten als json laden
require_once('../config.php');

// -> json aktivieren
header('Content-Type: application/json');

// -> verbindung mit der datenbank
try {
    // Erstellt eine neue PDO-Instanz mit der Konfiguration aus config.php
    $pdo = new PDO($dsn, $username, $password, $options);

    $today = date('Y-m-d');

    // SQL-Query mit Platzhaltern für das Einfügen von Daten
    $sql = "SELECT * FROM meteoride WHERE DATE(timestamp) = :today";

    // Bereitet die SQL-Anweisung vor
    $stmt = $pdo->prepare($sql);

    // Fügt jedes Element im Array in die Datenbank ein
    //foreach ($data as $item) {
        $stmt->execute( ['today' => $today]);

    // -> daten in empfang nehmen
    $results = $stmt->fetchAll();

    // -> daten als json zurückgeben
    echo json_encode($results);

}   catch (PDOException $e) {
    die("Verbindung zur Datenbank konnte nicht hergestellt werden: " . $e->getMessage());
}