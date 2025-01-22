import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Typography from "@mui/material/Typography";
import AcUnitIcon from "@mui/icons-material/AcUnit"; //cold
import WbSunnyIcon from "@mui/icons-material/WbSunny";
import ThunderstormIcon from "@mui/icons-material/Thunderstorm";
import "./InfoBox.css";

export default function InfoBox({ info }) {
  let HOT_IMG =
    "https://images.unsplash.com/photo-1476209446441-5ad72f223207?q=80&w=1373&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
  let COLD_IMG =
    "https://images.unsplash.com/photo-1647058865180-a8fbd81909a7?q=80&w=1405&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
  let RAIN_IMG =
    "https://images.unsplash.com/photo-1519692933481-e162a57d6721?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

  return (
    <div className="InfoBox">
      <h1 style={{ textAlign: "center" }}>Weather Info - "{info.weather}" </h1>
      <div className="card-container">
        <Card sx={{ maxWidth: 345 }}>
          <CardMedia
            sx={{ height: 140 }}
            image={
              info.humidity > 80
                ? RAIN_IMG
                : info.temp < 15
                ? COLD_IMG
                : HOT_IMG
            }
            title="green iguana"
          />
          <CardContent>
            <Typography gutterBottom variant="h5" component="div">
              <span className="dark">{info.city}</span> 
              <span className="weather-icon">
                {info.humidity > 80 ? (
                  <ThunderstormIcon />
                ) : info.temp < 15 ? (
                  <AcUnitIcon />
                ) : (
                  <WbSunnyIcon />
                )}
              </span>
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              component={"span"}
            >
              <p>Temperatute = {info.temp} &deg;C </p>
              <p>Humidity = {info.humidity} </p>
              <p>Min Temp = {info.tempMin} &deg;C</p>
              <p>Max Temp = {info.tempMax} &deg;C</p>
              <p>
                Weather can de described as <i className="dark">{info.weather}</i> and feels like <span className="dark">{info.feelsLike} &deg;C</span>
              </p>
            </Typography>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
