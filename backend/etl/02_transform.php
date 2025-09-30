<?php

$data = include ('01_extract.php'); 

$transformed_data = [
    "temperature" => $data['weather']['current']['temperature_2m'],
    "rain" => $data['weather']['current']['rain'],
    "booked_bikes" => $data['bikes']['countries'][0]['booked_bikes']
];

return $transformed_data;

/* echo '<pre>';
var_dump($transformed_data);
echo '</pre>'; */