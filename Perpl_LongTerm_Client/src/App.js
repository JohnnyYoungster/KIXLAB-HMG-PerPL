import React, {useEffect, useState} from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import "./App.css"

import "./index.css";
import Login from "./component/Login";
import Map from "./component/Map";
import Music from "./component/Music";
import PlayList from "./component/PlayList";


function App() {
	const navigate = useNavigate()
	const location = useLocation()
  	// const [weights,setWeights]= React.useState({jam:0.3,weather:0.35,location:0.35})
  	const [context, setContext] = useState();
  	const [pathMetaData, setPathMetaData] = useState([]);
	const [trackSimulationTicker, setTrackSimulationTicker] = useState(0)

	useEffect(() => {
		const authToken = window.localStorage.getItem("token")
		if (!authToken) {
			return navigate('/')
		} else {
			if(location.pathname === '/') {
        		return navigate('/map')
			}
		}
	}, [])
	
	return (
			<Routes>
				<Route path="/" element={<Login />} />
				{/* <Route path="/playlist" element={<PlayList playlist={playlist} setWeights={setWeights}/>} /> */}
                <Route path="/map" 
					element={
						<Map 
							navigate={navigate} 
							setContext={setContext}
							setPathMetaData={setPathMetaData}
							setTrackSimulationTicker={setTrackSimulationTicker}
						/>} 
				/>
                <Route 
					path="/music" 
					element={
						<Music 
							context={context}
							pathMetaData={pathMetaData}
							setTrackSimulationTicker={setTrackSimulationTicker}
						/>
					}
				/>
			</Routes>		
	);
}

export default App;
