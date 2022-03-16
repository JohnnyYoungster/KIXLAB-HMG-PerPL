import React, { Component, useState, useEffect, useCallback} from "react";
import "./Login.css"
import instance from '../axiosFactory';
import { useNavigate } from "react-router-dom"
import spotifyWebApi from "spotify-web-api-node";



function Login() {
  const [songNames, setSongNames] = useState([]);
  const [spotifyPlayer, setPlayer]=useState();
  const [device_id, setDevice]=useState();
  const navigate = useNavigate()


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

  const accessToken = new URLSearchParams(window.location.hash.split('#')[1]).get('access_token')

  useEffect(() => {
    if (accessToken) { 
      window.localStorage.setItem("token", accessToken)
      return navigate("/map")
    }
  }, [accessToken])

  return (
    <div className="App">
      <div className="app-title">
        PER.PL
      </div>
      <div className = "button-container">
      {!accessToken && (
        <button 
          className = "button-login"
          onClick={(e) => {
            console.log(loginUrl)
            e.preventDefault();
            window.location.replace(loginUrl)
          }}
        >Let's Begin!</button>
      )}
      </div>
    </div>
  );
}

export default Login;
