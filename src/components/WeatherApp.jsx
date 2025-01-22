import './WeatherApp.css';
import SearchBox from './SearchBox';
import InfoBox from './InfoBox';
import { useState } from 'react';

export default function WeatherApp() {

    let [info, setInfo] = useState("")

    return (
        <>
            <SearchBox giveInfo={setInfo} />
            { info === "" ? "" : <InfoBox info={info} /> }
            
        </>
    )

}
