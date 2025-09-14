import "./WeatherInfoDay.css";

export const WeatherInfoDay = ({ selectedDay, data }) => {
  return (
    <div className="selected-day-info">
      <h3>Details for {selectedDay}</h3>
      <div className="details-cards">
        {data.list.map((d, i) => {
          if (d.dt_txt.split(" ")[0] === selectedDay) {
            return (
              <div className="details-card" key={i}>
                <p> <strong> {d.weather[0].description} at {d.dt_txt.split(" ")[1]}</strong> </p>
                <p>Temp: {d.main.temp}°C</p>
                <p>Humidity: {d.main.humidity}%</p>
                <p>Wind: {d.wind.speed} m/s</p>
                <p>Chance of Rain: {Math.round(d.pop * 100)}%</p>
              </div>
            );
          }
        })}
      </div>{" "}
    </div>
  );
};
