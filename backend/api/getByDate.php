<?php
// -> json aktivieren
header('Content-Type: application/json');

// -> daten als json laden
require_once('../config.php');

// -> verbindung mit der datenbank
try {
    // Erstellt eine neue PDO-Instanz mit der Konfiguration aus config.php
    $pdo = new PDO($dsn, $username, $password, $options);

    $date = $_GET['date'];

    // SQL-Query mit Platzhaltern für das Einfügen von Daten
    $sql = "SELECT * FROM meteoride WHERE timestamp >= :date_minus
            AND timestamp < :date_plus";

    // Bereitet die SQL-Anweisung vor
    $stmt = $pdo->prepare($sql);

    // Fügt jedes Element im Array in die Datenbank ein
    //foreach ($data as $item) {
        $stmt->execute([
    ':date_minus' => date('Y-m-d', strtotime($date . ' -2 days')),
    ':date_plus' => date('Y-m-d', strtotime($date . ' +1 day')),
]);

    // -> daten in empfang nehmen
    $results = $stmt->fetchAll();

    $grouped = [];

foreach ($results as $entry) {
    $date = substr($entry['timestamp'], 0, 10); // Extrahiere das Datum (YYYY-MM-DD)

    // Wenn noch kein Eintrag für diesen Tag existiert oder dieser mehr booked_bikes hat
    if (!isset($grouped[$date]) || $entry['booked_bikes'] > $grouped[$date]['booked_bikes']) {
        $grouped[$date] = $entry;
    }
}
$data = array_values($grouped);

$sql_latest = "SELECT * FROM meteoride ORDER BY timestamp DESC LIMIT 1";
$stmt_latest = $pdo->prepare($sql_latest);
$stmt_latest->execute();
$latest_entry = $stmt_latest->fetch();
$data[] = $latest_entry;

    // -> daten als json zurückgeben
    echo json_encode($data);

}   catch (PDOException $e) {
    die("Verbindung zur Datenbank konnte nicht hergestellt werden: " . $e->getMessage());
}