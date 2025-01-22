import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import "./SearchBox.css";
import { useState } from "react";

export default function SearchBox({ giveInfo }) {
  const API_key = "6950e279fadbda53f02566f0e264c10f";

  let [city, setCity] = useState("");
  let [error, isError] = useState(false);

  const API_URL = "https://api.openweathermap.org/data/2.5/weather?";

  function handleChange(event) {
    setCity(event.target.value);
  }

  let getWeatherData = async () => {
    try {
      let response = await fetch(
        API_URL + `q=${city}&appid=${API_key}&units=metric`
      );
      let jsonResponse = await response.json();

      let result = {
        city: jsonResponse.name,
        temp: jsonResponse.main.temp,
        tempMax: jsonResponse.main.temp_max,
        tempMin: jsonResponse.main.temp_min,
        humidity: jsonResponse.main.humidity,
        feelsLike: jsonResponse.main.feels_like,
        weather: jsonResponse.weather[0].description,
      };

      giveInfo(result);

      isError(false);
    } catch (err) {
      isError(true);
      giveInfo("");
    }
  };

  function handleSubmit(evt) {
    evt.preventDefault();
    setCity("");
    getWeatherData();
  }

  return (
    <div className="SearchBox">
      <h2>Search for the weather</h2>
      <form onSubmit={handleSubmit}>
        <TextField
          id="outlined-basic"
          label="City"
          variant="outlined"
          title="Enter name of place"
          onChange={handleChange}
          value={city}
          required
        />
        <br />
        <br />
        <Button variant="contained" type="submit">
          Search
        </Button>
        <h4 style={{ color: "red" }}>
          {" "}
          {error && "This place is not in API!"}{" "}
        </h4>
      </form>
    </div>
  );
}
