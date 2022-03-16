import React, {useEffect, useRef, useState} from "react";
import styled from "styled-components";
import { FaWind, FaMountain, FaWater } from 'react-icons/fa';
import { AiFillCar } from 'react-icons/ai';
import { BsSnow2, BsFillCloudRainFill, BsCloudyFill, BsBuilding } from 'react-icons/bs';
import { IoSunny } from 'react-icons/io5';
import { GiForest } from 'react-icons/gi';
import { ImRoad } from 'react-icons/im';

const sliderThumbStyles = (props) => (`
    width: 25px;
    height: 25px;
    background-color: ${props.color};
    cursor: pointer;
    outline: 5px solid #333;
    opacity: ${props.opacity}

    -webkit-transition: .2s;
    transition: opacity .2s;

`)

const Styles = styled.div`
    display: flex;
    align-items: center;
    color: #888;
    flex-direction: column;
    margin-top: 2rem;
    margin-bottom: 2rem;
    padding: 10px;
    // transform: rotate(-90deg);

    .value {
        // flex: 1;
        font-size: 2rem;
        // transform: rotate(90deg);
    }

    .slider {
        flex:6;
        -webkit-apperance: none;
        width: 8px;
        height: 175px;
        padding: 0 5px;
        border-radius: 5px;
        background: #efefef;

    }

    .slider2-container {
        position: relative;
        width: 50px;
        height: 200px;
    }

    .slider2 {
        -webkit-appearance: slider-vertical;
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        z-index:1;
        opacity: 0;
    }

    .slider2-label {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        border-radius: 12px;
        overflow: hidden;
        &:before {
            position: absolute;
            left: 0;
            top: 0;
            display: block;
            content: "";
            width: 100%;
            height: 100%;
            background: #222222;
        }
        &:after {
            position: absolute;
            left: 0;
            bottom: 0;
            display: block;
            content: "";
            width: 100%;

            height: ${props => props.value}%;
            background: ${props => props.color};
        }
    }

    .slider2-context {
        padding: 10px;
        font-size: 25px;
        color: white;
    }

`;

/*
&::-webkit-slider-thumb {
            visibility: hidden;            
            -webkit-appeance: none;
            appearance: none;
            ${props => sliderThumbStyles(props)}
        }

        &::-moz-range-thumb {
            ${props => sliderThumbStyles(props)}
        }
*/

const Slider = ({color, context, setWeight, setChange, initWeight}) => {

    const [value, setValue] = useState(initWeight);
    const [timer, setTimer] = useState();
    let context_icon;
    const handleOnChange = (e) => {
        setValue(e.target.value)
        setWeight(parseInt(e.target.value))
        setChange();
    }
    // console.log("context here", context)

    if (context == "jam_high") {
        context_icon = <AiFillCar style={{color: 'coral'}} />
    } else if (context == "jam_low") {
        context_icon = <AiFillCar style={{color: 'lime'}} />
    } else if (context == "wt_snow") {
        context_icon = <BsSnow2/>
    } else if (context == "wt_rain") {
        context_icon = <BsFillCloudRainFill/>
    } else if (context == "wt_cloud") {
        context_icon = <BsCloudyFill/>
    } else if (context == "wt_wind") {
        context_icon = <FaWind/>
    } else if (context == "wt_sun") {
        context_icon = <IoSunny/>
    } else if (context == "lc_mount") {
        context_icon = <FaMountain/>
    } else if (context == "lc_water") {
        context_icon = <FaWater/>
    } else if (context == "lc_city") {
        context_icon = <BsBuilding/>
    } else if (context == "lc_country") {
        context_icon = <GiForest/>
    } else if (context == "lc_highway") {
        context_icon = <ImRoad/>
    }
    

    return (
        <Styles  color={color} value={value} context={context} setChange = {setChange}>
            <div className="slider2-container">
                <label className="slider2-label" htmlFor="my-slider"></label>
                <input name="my-slider" className="slider2" orient="vertical" type="range" min={0} max={100} value={value} onChange = {handleOnChange} />
            </div>
            <div className ="slider2-context">
                {context_icon}
            </div>

        </Styles>
    )
}

export default Slider