import React, { Component, useState, useEffect, useCallback} from "react";
import styled from "styled-components";
import RadarChart from 'react-svg-radar-chart';
import 'react-svg-radar-chart/build/css/index.css'
import "./Chart.css"

// class Chart extends React.Component {
//     render() { 

const Chart = ({musicref, musiccurr}) => {
    console.log(musicref)
    const data = [
        {data: { //reference
            acoustic: musicref[0],
            instrumentalness: musicref[1],
            liveness: musicref[2],
            speechiness: musicref[3],
            danceability: musicref[4],
            energy: musicref[5],
            valence: musicref[6]
        },
        meta: { color: '#454545' }},
        {data: { //current
            acoustic: musiccurr[0],
            instrumentalness: musiccurr[1],
            liveness: musiccurr[2],
            speechiness: musiccurr[3],
            danceability: musiccurr[4],
            energy: musiccurr[5],
            valence: musiccurr[6]},
        meta: { color: '#ffaa00' }
        }
    ];

    const captions = {
    // columns
        acoustic: 'Acousticness',
        instrumentalness: 'Instrumentalness',
        liveness: 'Liveliness',
        speechiness: 'Speechliness',
        danceability: 'Danceability',
        energy: 'Energy',
        valence: 'Valence'
    };

    const options = {
        zoomDistance: 1.3,
        captionProps: () => ({
            className: 'caption',
            textAnchor: 'middle',
            fontSize: 15,
            fontFamily: 'sans-serif'
          })
    };   
    

    return (
        <div className="chart-background" musicref={musicref} musiccurr={musiccurr}>
            <RadarChart className = "chart-part"
                captions={captions}
                data={data}
                options={options}
                size={400}
            />
        </div>
        );
}
//     }
//   }
  

export default Chart

