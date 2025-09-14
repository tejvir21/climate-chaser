import "./Forcast.css";
import { useState } from "react";
import { WeatherInfoDay } from "./WeatherInfoDay";

export const Forcast = ({ data }) => {
  const [selectedDay, setSelectedDay] = useState(null);
  const [date, setDate] = useState([]);

  data.list.forEach((item) => {
    const itemDate = item.dt_txt.split(" ")[0];
    if (!date.includes(itemDate)) {
      setDate([itemDate, ...date]);
    }
  });

  return (
    <>
      <div className="Forcast">
        <h3>Weather forcast for {data.city.name}</h3>
        <div className="forcast-cards">
          {date.map((item, index) => {
            let max_temp = 0;
            let min_temp = 100;
            let chances_of_rain = 0;
            let counter = 0;
            data.list.map((d, i) => {
              if (d.dt_txt.split(" ")[0] === item) {
                counter++;
                max_temp = Math.max(max_temp, d.main.temp_max);
                min_temp = Math.min(min_temp, d.main.temp_min);
                chances_of_rain += d.pop;
              }
            });

            return (
              <div
                className="forcast-card"
                key={index}
                onClick={() => setSelectedDay(item)}
              >
                <p>{item}</p>
                <p className="drop">
                  {" "}
                  <span
                    style={{
                      backgroundColor: "#0796deff",
                      width: "100%",
                      height: Math.round((chances_of_rain * 100) / (counter*2)),
                      position: "absolute",
                      zIndex: -1,
                      alignSelf: "flex-end",
                      bottom: 0,
                    }}
                  ></span>{" "}
                  {Math.round((chances_of_rain * 100) / counter)}%
                </p>
                <div className="temp">
                  <p>{max_temp}°C</p>
                  <p>{min_temp}°C</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {selectedDay && <WeatherInfoDay selectedDay={selectedDay} data={data} />}
    </>
  );
};
