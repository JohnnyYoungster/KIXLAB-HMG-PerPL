import React, { Component, useState, useEffect, useCallback} from "react";
import "./MusicList.css"
import { BsFillPlayCircleFill } from 'react-icons/bs';


export default function MusicList({ 
    playlist, 
    updateWait,
    songIndex,
    targetSegmentIdx,
    // loadedSegmentIdx,
    skipToSong
}){
    

    const [targetPlayList, setTargetPlayList] = useState(null)
    useEffect(()=> {
        setTargetPlayList(playlist.filter((_, idx) => idx === Math.min(playlist.length-1, targetSegmentIdx))[0])
    }, [targetSegmentIdx, playlist])


    // console.log(loadedSegmentIdx, targetSegmentIdx)
    return (
        <div>
        <div className="upcoming-song">Upcoming songs</div>
        <div className="all-song">
            {updateWait || targetPlayList===null ? (<div className="playlist-update">Updating Playlist...</div>)
            : (
                <>
                    <div>
                        {targetPlayList["songNames"].map((song, idx) => (
                            (idx>songIndex && idx<=songIndex+5) &&
                            <div className="each-song">
                                <div className="each-song-name">{song}</div>
                                <div className="each-song-play">
                                    <BsFillPlayCircleFill style={{color: 'white', 'margin-left': '20px', 'font-size': '20px', 'vertical-align': 'middle'}}
                                    onClick={(e)=>{
                                        skipToSong(idx)
                                    }}
                                    />
                                </div>
                            </div>
                            
                        ))}
                    </div>
                </>
                    
                )        
            }
        </div>
        </div>)
    
    // 0 1 2 3 4
    // 3   0 1 2
    // 2 3   0 1
    //   0 1 2 3
};