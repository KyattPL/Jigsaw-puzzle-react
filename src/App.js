import { useEffect, useState } from 'react';

import './App.css';

import { JigsawPuzzle } from "./JigsawPuzzle.tsx";
import './JigsawPuzzle.css';

function App() {
    const [timer, setTimer] = useState(0);
    const [intervalId, setIntervalId] = useState(null);

    const updateTime = () => {
        setTimer(prev => prev + 1);
    }

    const solved = () => {
        clearInterval(intervalId);
        alert("You won!");
    }

    useEffect(() => {
        console.log("i fire once");
        let intId = setInterval(updateTime, 1000);
        setIntervalId(intId);
    }, []);

    return (
        <>
        <JigsawPuzzle imageSrc="https://exumag.com/wp-content/uploads/2018/02/Grumpy-Cat-t%C5%82o-1170x659.jpg"
            rows={4} columns={4} onSolved={solved}/>
        <div className="puzzle-box"></div>
        <div className="timer-box">{Math.floor(timer / 60)}min {timer % 60}s</div>
        </>
    );
}

export default App;
