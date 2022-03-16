/*global Tmapv2*/
import React, { Component, useState, useEffect, useCallback} from "react";
import MultiRangeSlider from "multi-range-slider-react";
import { FaSnowflake } from 'react-icons/fa';
import { AiFillCar } from 'react-icons/ai';
import { GiNightSleep, GiPartyPopper} from 'react-icons/gi';
import { MdMovie } from 'react-icons/md'
import { BsTreeFill, BsFillSkipEndCircleFill, BsPauseCircleFill, BsFillPlayCircleFill, BsSuitHeartFill } from 'react-icons/bs';

import "./Music.css"
import instance from '../axiosFactory';
import spotifyWebApi from "spotify-web-api-node";
import styled from "styled-components";
import Slider from "./Slider";
import Chart from "./Chart";
import MusicList from "./MusicList";



const BlurBg = styled.div`
  & > * {
    position: relative;
    z-index: 1;
  }
  &:before {
    display: block;
    content: "";
    position: fixed;
    height: 100vh;
    width: 100vw;
    left: 50%;
    top: 50%;
    /* Add the blur effect */
    filter: blur(8px);
    -webkit-filter: blur(8px);
    
    /* Center and scale the image nicely */
    background-position: center;
    background-repeat: no-repeat;
    background-size: cover;
    background-image: url(${props => props.src});
    transform: scale(1.1) translate(-50%, -50%);
    opacity: 0.8;
  }
  &:after {
    display: block;
    content: "";
    position: fixed;
    height: 100vh;
    width: 100vw;
    left: 0;
    top: 0;
    background: linear-gradient(to bottom, rgba(0,0,0,0) 0%,rgba(0,0,0,1) 100%);
  }
`


export default function Music({
    context,
    pathMetaData,
    setTrackSimulationTicker
  }) {

  const [songIndex, setSongInd]=useState(0);
  const [segmentIndex, setSegInd]=useState(0);

  const [spotifyPlayer, setPlayer]=useState();
  const [deviceId, setDeviceId]=useState();

  const [curSongName,setSongName]=useState();
  const [curImage,setImage]=useState();
  const [curArtist,setArtist]=useState();
  const [isPlaying, setIsPlaying]=useState(false);
  const [showImg, setShowImg] = useState(true);
  const [isRewarded, setIsRewarded] = useState(false);

  const [playlist, setPlaylist] = useState([]);
  const [artists, setArtists] = useState([]);
  const [account, setAccount] = useState("");
  const clientId = process.env.REACT_APP_SPOTIFY_CLIENT_ID
  const accessToken = window.localStorage.getItem("token")

  const [songLoaded, setSongLoaded]=useState(false);
  const [playerLoaded, setPlayerLoaded]=useState(false);
  const [songLoadingProgress, setSongLoadingProgress] = useState(0)

  const [musicVecRef, setMusicVecRef] = useState([]);
  const [musicVecCurr, setMusicVecCurr] = useState([]);

  const [banlist, setBanlist]= useState([]);

  const [jamWeight, setJamWeight]= useState(20);
  const [wtWeight, setWTweight]=useState(50);
  const [lcWeight, setLCweight]=useState(30);
  const [weights, setWeights]=useState({"jam_high": 0.2, "jam_low": 0.2,
  "wt_snow": 0.5, "wt_rain": 0.5,
  "wt_cloud": 0.5, "wt_wind": 0.5, "wt_sun": 0.5,
  "lc_mount": 0.3, "lc_water": 0.3, "lc_city": 0.3,
  "lc_country": 0.3, "lc_highway": 0.3});

  const [timer, setTimer] = useState(-1);

  const [targetSegmentIdx, setTargetSegmentIdx] = useState(0)

  const [updateWait, setUpdateWait]=useState(false);

  const [sleepSongs, setSleepSongs]=useState();
  const [isSleeping, setSleeping]=useState(false);
  const [sleepSongIndex, setSleepSongIndex]=useState(0);
  // const setChange1 = () => {
  //     clearTimeout(timer)
  //     setTimer(
  //       setTimeout(() => 
  //         {setJamWeight(jamWeight)
  //         setWTweight(wtWeight)
  //         setLCweight(lcWeight)
  //         }, 5000))
  //   }

  // const setChange2 = () => {
  //   clearTimeout(timer)
  //   setTimer(
  //     setTimeout(() => 
  //       {setJamWeight(jamWeight)
  //       setWTweight(wtWeight)
  //       setLCweight(lcWeight)
  //       }, 5000))
  //   }

  // const setChange3 = () => {
  //   clearTimeout(timer)
  //   setTimer(
  //     setTimeout(() => 
  //       {setJamWeight(jamWeight)
  //       setWTweight(wtWeight)
  //       setLCweight(lcWeight)
  //       }, 5000))
  // }

  const setChange = useCallback( () => {
    clearTimeout(timer)
    setTimer(
      setTimeout(() => 
        {
          updateSong();
        }, 5000))
  },[playlist, account, artists, banlist, weights,targetSegmentIdx]);

  // const [jamWeight, setJamWeight]= useState(20);
  // const [wtWeight, setWTweight]=useState(50);
  // const [lcWeight, setLCweight]=useState(30);
  // const [weights, setWeights]=useState({"jam_high": 0.2, "jam_low": 0.2,
  // "wt_snow": 0.5, "wt_rain": 0.5,
  // "wt_cloud": 0.5, "wt_wind": 0.5, "wt_sun": 0.5,
  // "lc_mount": 0.3, "lc_water": 0.3, "lc_city": 0.3,
  // "lc_country": 0.3, "lc_highway": 0.3});

  const [trackEnd, setTrackEnd]=useState(false);

  const [timeSegment, setTimeSegment]=useState(0);

  useEffect(() => {
		const credentials = {
            clientId,
            accessToken,
        };
    const spotifyApi = new spotifyWebApi(credentials)
          
    spotifyApi.getMyTopArtists()
            .then(
                function(data) {
                    setArtists(data.body.items.map(x=>x.id))
                }, 
                function(err) {
                    console.log('Something went wrong!', err);
					reLogin();
                }
            )
        
    spotifyApi.getMe()
            .then(
                function(data) {
                    setAccount(data.body.display_name)
                }, 
                function(err) {
                    console.log('Something went wrong!', err);
                }
            )
  }, [])

  useEffect(() => {

    if (playlist.length) {
      console.log(playlist);
      const music_vector_ref = JSON.parse(playlist[targetSegmentIdx]["music_vector"]);
      const music_vector_curr = JSON.parse(playlist[targetSegmentIdx]["songStats"][songIndex]);
  
      const musicVecRef = Object.values(music_vector_ref)
      const musicVecCurr = Object.values(music_vector_curr)
  
      setMusicVecRef(musicVecRef)
      setMusicVecCurr(musicVecCurr)

      // setMusicVecRef(musicVecRef);
      // setMusicVecCurr(musicVecCurr);
    }

  }, [playlist, songIndex, targetSegmentIdx])

	const reLogin=useCallback(()=>{
		const authEndpoint = "https://accounts.spotify.com/authorize";
		const redirectUri = "http://localhost:3000/";
		const clientId = process.env.REACT_APP_SPOTIFY_CLIENT_ID
		const scopes = [
		"streaming",
		"user-top-read",
		"user-read-recently-played",
		"playlist-read-private",
		"user-read-private",
		"user-read-email",
		"user-modify-playback-state"
		];
		const loginUrl = `${authEndpoint}?client_id=${clientId}&response_type=token&redirect_uri=${redirectUri}&scope=${scopes.join("%20")}`;
		window.location.replace(loginUrl)
	},[])

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    document.body.appendChild(script);
    window.onSpotifyWebPlaybackSDKReady = () => {
        const spotifyPlayer = new window.Spotify.Player({
            name: 'Web Playback SDK',
            getOAuthToken: cb => { cb(accessToken); },
            volume: 0.5
        });
        setPlayer(spotifyPlayer);
        spotifyPlayer.addListener('ready', ({ device_id }) => {
            console.log('Ready with Device ID', device_id);
            setDeviceId(device_id);
        });
        spotifyPlayer.addListener('not_ready', ({ device_id }) => {
            console.log('Device ID has gone offline', device_id);
        });
        spotifyPlayer.addListener('player_state_changed', (state) => {
          update(state);
        });
        spotifyPlayer.connect();
        setPlayerLoaded(true);
    };
  }, []);

  useEffect(()=>{
    if(trackEnd){
      setTrackEnd(false);
      nextSong();
    }
  },[trackEnd, targetSegmentIdx, songIndex, playlist, spotifyPlayer])
  

  //Initial song play function once page loads in.
  useEffect(()=>{
    if(playerLoaded && songLoaded){
      playSong({
        playerInstance: spotifyPlayer,
        spotify_uri: `spotify:track:${playlist[targetSegmentIdx]["songs"][songIndex]}`,
      })
      // setInterval(()=>{
      //   setTimeSegment(prevTime=>prevTime+1)
      // },[180000]);
    }
  },[playerLoaded,songLoaded])

  // useEffect(()=>{
  //   console.log(timeSegment);
  // },[timeSegment]);


  useEffect(()=>{
    var weightSum=jamWeight+wtWeight+lcWeight
    weightSum= weightSum===0 ? 1 : weightSum
    const jw=jamWeight/weightSum
    const ww=wtWeight/weightSum
    const lw=lcWeight/weightSum
    const preWeight={"jam_high": jw, "jam_low": jw,
    "wt_snow": ww, "wt_rain": ww,
    "wt_cloud": ww, "wt_wind": ww, "wt_sun": ww,
    "lc_mount": lw, "lc_water": lw, "lc_city": lw,
    "lc_country": lw, "lc_highway": lw}
    setWeights(preWeight)
    console.log(preWeight)
  },[jamWeight,wtWeight,lcWeight])


  const update= useCallback((state)=>{
    const current_track=state.track_window.current_track
    setImage(current_track.album['images'][2]["url"]);
    setSongName(current_track['name']);
    setArtist(current_track['artists'][0]['name']);
    if(state.paused && 
      state.track_window.previous_tracks.find(x => x.id === state.track_window.current_track.id)
      &&
      !state.loading){
      console.log(state);
      setTrackEnd(true);
    }
  },[]);

  const playSong = useCallback(({
    spotify_uri,
    playerInstance: {
        _options: {
            getOAuthToken
        }
    }
    })=>{
        getOAuthToken(access_token => {
            fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
                method: 'PUT',
                body: JSON.stringify({ uris: [spotify_uri] }),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${access_token}`
                },
            });
        });
        setIsPlaying(true);
  },[deviceId]);

  // const toggleSong= useCallback(()=>{
  //   spotifyPlayer.togglePlay().then(() => {
  //   console.log('Toggled playback!');
  // });},[spotifyPlayer]);
  const getSliderPair = (dict, word) => {
    // console.log(dict)
    // console.log(word)

    const curr_context = Object.entries(dict).filter(([k , v]) => 
              v > 0 && k.includes(word))
    // console.log(curr_context.map([k, v]))
    // console.log(curr_context)
    // console.log(curr_context[0][0])
    return curr_context[0][0]
    // return (key.id)
  }

  const updateSong= useCallback(async ()=>{
    setUpdateWait(true);
    var newBanlist=banlist.slice(0,10*(targetSegmentIdx+1));
    // console.log(newBanlist);
    var oldPlaylist=playlist.slice(0,targetSegmentIdx);
    var arr=[]
    for (var segment=targetSegmentIdx; segment<playlist.length; segment++){
      const response = await instance.post('/getSong',{
        context_vector: context[segment],
        weights: weights,
        user_name: account,
        song_number: 7,
        artists: artists,
        banlist: newBanlist.slice(-30)
      });
      const data = response.data
      arr.push(response.data)
      // setPlaylist(prevList=>({...prevList, [segment]: data}))
      newBanlist=newBanlist.concat(data["songs"])
    }
    setBanlist(newBanlist);
    setPlaylist(oldPlaylist.concat(arr));
    console.log("updated!");
    setSongInd(0);
    setUpdateWait(false);
  },[playlist, account, artists, banlist, weights, targetSegmentIdx])

  const nextSong = useCallback(async ()=>{
    if(!isSleeping){
      setIsRewarded(false); // @yohan: 일단 skip 하면 버튼 다시 화이트로 돌아가게 했는데, db 에 저장된 정보가 있으면 이에 맞춰야할 것 같아요. 
      setShowImg(true);
      var newSong = songIndex+1
      if(playlist[targetSegmentIdx]["songs"].length-1<newSong){
        newSong=0;
      }
      playSong({
            playerInstance: spotifyPlayer,
            spotify_uri: `spotify:track:${playlist[targetSegmentIdx]["songs"][newSong]}`,
      })  
      setSongInd(newSong);
    }
    else{
      playSong({
        playerInstance: spotifyPlayer,
        spotify_uri: `spotify:track:${sleepSongs["songs"][sleepSongIndex+1]}`,
      })
      setSleepSongIndex(index=>index+1)
    }
  },[targetSegmentIdx, songIndex, playlist, spotifyPlayer, timeSegment, isSleeping, sleepSongIndex, sleepSongs])

  useEffect(()=>{
    setSongInd(0)
  },[targetSegmentIdx])

  useEffect(() => {
		if (pathMetaData.length > 0 && songLoaded) {
			const duration = 1
			const interval = setInterval(() => {

				setTrackSimulationTicker(prevTicker => {
					const currTick = prevTicker + duration
					const lastAccTime = pathMetaData[pathMetaData.length-1].accTime
					const finishTime = lastAccTime[lastAccTime.length-1]

					// console.log(`I am moving...: ${currTick}`);
					for(let i=0; i<pathMetaData.length; i++){
						const {accTime, coordinates} = pathMetaData[i]
						for (let j=0; j-1<accTime.length; j++){
							if (accTime[j]<=currTick && currTick<accTime[j+1]){
								// console.log(i, pathMetaData[i])
								// console.log(i)
								setTargetSegmentIdx(i)
								const timediff = accTime[j+1] - accTime[j]
								const ratio = (currTick - accTime[j]) / timediff
								const coord = coordinates[j]
								const coord2 = coordinates[j+1]
								const latlng = new Tmapv2.Point((coord2[0] - coord[0]) * ratio + coord[0], (coord2[1] - coord[1]) * ratio + coord[1])
								const projection = new Tmapv2.Projection.convertEPSG3857ToWGS84GEO(latlng)
								const lat = projection._lat
								const lng = projection._lng;
								
								// console.log(currTick, accTime[j], accTime[j+1], lat, lng)
								// console.log(`현재위치 ${finishTime - currTick}초 남음`)
							}
						}
					}
					return currTick
				})
				
			}, duration*1000);
			
			// loadKeepList();
	
			return () => {
				clearInterval(interval);
				setTrackSimulationTicker(0)
			};	
		}
	}, [pathMetaData, songLoaded]);


	const fetchNextPlaylistAhead = useCallback(async () => {
		if ( account !== "" ) {
			setSongLoaded(false);
			const arr = []
			const banArr = []

			const remains = pathMetaData.length - playlist.length
			// console.log(targetSegmentIdx, remains, playlist.length)
			for(let l=0; l<remains; l++){
				const response = await instance.post('/getSong',{
					context_vector: context[playlist.length + l],
					weights: weights,
					user_name: account,
					song_number: 7,
					artists: artists,
					banlist: banArr.slice(-30)
				});
				const tempSongs = response.data
				arr.push(tempSongs)
				banArr.push(...tempSongs['songs'])
				console.log([...playlist, ...arr])
        // console.log(banArr);
			}
			setPlaylist([...playlist, ...arr])
			setBanlist([...banlist, ...banArr])
			setSongLoaded(true)
		}
  	}, [targetSegmentIdx, artists, account, weights])


  useEffect(() => {
	  fetchNextPlaylistAhead();
  }, [fetchNextPlaylistAhead]);

  const skipToSong=useCallback((skipIndex)=>{
    playSong({
      playerInstance: spotifyPlayer,
      spotify_uri: `spotify:track:${playlist[targetSegmentIdx]["songs"][skipIndex]}`,
    });
    setSongInd(skipIndex);
  },[spotifyPlayer,targetSegmentIdx,playlist]
  );

  return (
    
    <BlurBg src={curImage}>
      <header>
        <div className="header-title">
          PER.PL
        </div>
        {songLoaded &&
        <div>
          <BsSuitHeartFill  onClick = {(e) => {
            isRewarded ? setIsRewarded(false) : setIsRewarded(true);

            const getContext = async() => {
              const response = await instance.post('/like',{
                context_vector:  context[targetSegmentIdx],
                weights: playlist[targetSegmentIdx]["songWeights"][songIndex],
                user_name: account,
                song_number: playlist[targetSegmentIdx]["songs"][songIndex],
              });
              setChange()
              setIsRewarded(true);
            }
            getContext();
            console.log("context get")
          }} className= {isRewarded ? "isRewarded clicked" : "isRewarded"}/>
        </div>}
      </header>
      <div className="Music">
        {songLoaded ?
          <>
          <div className="music-player">
            <div className="song-info">
              <div className="song-img-and-chart" onClick = {(e) => {
                if (showImg == true) {
                  setShowImg(false);
                } else {
                  setShowImg(true);
                }
              }}>
                {showImg ? <img className={`song-img ${isPlaying ? 'playing' : ''}`} src={curImage}/>:
                    <div className="chart-area">
                      <Chart musicref = {musicVecRef} musiccurr = {musicVecCurr}/>
                    </div>}
              </div>
              <div className = "song-name">{curSongName}</div>
              <div className = "song-artist">{curArtist}</div>
            </div>

            <div className="player-control">
              <div className ="button-pause" onClick={(e)=>{
                setIsPlaying(!isPlaying);
                spotifyPlayer.togglePlay();
              }}> 
                {isPlaying ? <BsPauseCircleFill />: <BsFillPlayCircleFill/>}
              </div>
              
              <div className ="button-skip" onClick={(e)=>{
              nextSong()
                }}> 
                <BsFillSkipEndCircleFill />
              </div>
            </div>
          </div> 
          
            <div className="user-control">
              <div className="weight-preset">
                <div className= "context-weight-area">
                  <Slider color = "#8A2E92" context = {
                    getSliderPair(context[targetSegmentIdx], "jam") 
                  } setWeight={setJamWeight} setChange={setChange} initWeight={20}/> 
                  <Slider color = "#3C2E92" context = {
                    getSliderPair(context[targetSegmentIdx], "wt")
                  } setWeight={setWTweight} setChange={setChange} initWeight={50}/>
                  <Slider color = "#B02A7B" context = {
                    getSliderPair(context[targetSegmentIdx], "lc")
                  } setWeight={setLCweight} setChange={setChange} initWeight={30}/>
                </div>
                <div className="preset-button">
                  <button className="preset-sleep" onClick={async (e)=>{
                    const response = await instance.get('/getSleep');
                    setSleepSongs(response.data);
                    setSleeping(sleeping=>!sleeping);
                    playSong({
                      playerInstance: spotifyPlayer,
                      spotify_uri: `spotify:track:${response.data["songs"][sleepSongIndex]}`,
                    });
                  }
                  }><GiNightSleep /></button>
                  <div>SLEEP</div>
                  <button className="preset-dance"><GiPartyPopper /></button>
                  <div>DANCE</div>
                  <button className="preset-movie"><MdMovie /></button>
                  <div>MOVIE</div>

                </div>
              </div>
              {isSleeping ?               
              <MusicList playlist={[sleepSongs]} updateWait={updateWait} targetSegmentIdx={0} 
              songIndex={sleepSongIndex} skipToSong={skipToSong}>Music List Here!</MusicList>
              :
              <MusicList playlist={playlist} updateWait={updateWait} targetSegmentIdx={targetSegmentIdx} 
              songIndex={songIndex} skipToSong={skipToSong}>Music List Here!</MusicList>}
            </div>
          </>
        :
        <div className = "loading">
          Loading... :
          {/* {Math.round(songLoadingProgress*100)}% */}
          </div>
      }

      </div>
    </BlurBg>
  );
}