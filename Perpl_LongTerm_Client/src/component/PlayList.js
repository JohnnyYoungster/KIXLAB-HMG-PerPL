import React, { Component, useState, useEffect, useCallback} from "react";
import instance from '../axiosFactory';
import * as Tone from 'tone'
import spotifyWebApi from "spotify-web-api-node";

function PlayList () {
    const [songLoaded, setSongLoaded] = useState(true);
    const [songs, setSongs] = useState([]);
    const [songNames, setSongNames] = useState([]);
    const [songDownloaded, setSongDownloaded] = useState(true);
    const [spotifyPlayer, setPlayer]=useState();
    const [artists, setArtists] = useState([]);
    const [account, setAccount] = useState("");
    const [deviceId, setDeviceId]=useState();

    const clientId = process.env.REACT_APP_SPOTIFY_CLIENT_ID
    const accessToken = window.localStorage.getItem("token")

    const getSong = useCallback(async ()=> {
        setSongLoaded(false)
  
        const response = await instance.post('/getSong',{
            context_vector:  {"jam_high": 0, "jam_low": 1,
            "wt_snow": 0, "wt_rain": 1,
            "wt_cloud": 0, "wt_wind": 0, "wt_sun": 0,
            "lc_mount": 0, "lc_water": 0, "lc_city": 1,
            "lc_country": 0, "lc_highway": 0},
            weights: {"jam_high": 0, "jam_low": 0.2,
            "wt_snow": 0, "wt_rain": 0.5,
            "wt_cloud": 0, "wt_wind": 0, "wt_sun": 0,
            "lc_mount": 0, "lc_water": 0, "lc_city": 0.3,
            "lc_country": 0, "lc_highway": 0},
            user_name: account,
            song_number: 2,
            artists,
            token: accessToken,
        });
        setSongs(response.data.songs)
        setSongNames(response.data.songNames)
        setSongLoaded(true)
    },[]);

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
      
      
            spotifyPlayer.connect();
        };
    }, []);

    const downloadSong = useCallback(async ()=> {
        setSongDownloaded(false)
        const music = await instance.get('/download',{params:{songID:songs[0]},responseType: 'blob'});
        const url = URL.createObjectURL(music.data);
        const player = new Tone.Player(url).toDestination();
        Tone.loaded().then(() => {
            player.start();
        });
        setSongDownloaded(true)
    }, [songs]);

    /// 특정 노래를 재생하려면, playSong({spotifyPlayer, 'spotify:track:uid 트랙 넘버'}) 
    /// 식으로 전달해주면 됩니다!!
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
        },[deviceId]);

    return (
        <div>
            <button onClick={getSong} disabled={!songLoaded}>        
                {!songLoaded ? 'Loading...' : 'Get Song List'}
            </button>
            {songs.map((song, idx) => (
                <div key={song}>
                    <span>{songNames[idx]}{" "}</span>
                    <button onClick={(e)=>{playSong({
                        playerInstance: spotifyPlayer,
                        spotify_uri: `spotify:track:${song}`,
                    })}}>        
                        {!songDownloaded ? 'Loading...' : 'Play Song'}
                    </button>
                </div>
            ))}
        </div>
    )
}

export default PlayList