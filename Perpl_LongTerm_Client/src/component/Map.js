
/*global Tmapv2*/
// Do not delete above comment 
import React, { useState, useEffect, useRef, useCallback } from "react";
import styled from "styled-components";
import axios from "axios";

import "./Map.css"


const Navigation = styled.div`
	display: flex;
`
const SearchBox = styled.div`
	display: flex;
	flex-direction: column;
	width: 30%;
`
const ResultList = styled.div`
	flex: 1
`
ResultList.Item = styled.div`
	display: flex;
	align-items: center;
	cursor: pointer;
	&:hover {
		background: rgba(0,0,0,0.3);
	}
	& button {
		flex-shrink: 0;
		font-size: 10px;
		margin-left: 4px;
	}
`



export default function Map({ 
	navigate, 
	setContext,
	setPathMetaData,
	setTrackSimulationTicker
}) {
	
	const [map, setMap] = useState(null)
	const [start, setStart] = useState(null)
	const [end, setEnd] = useState(null)
	const [searchKey, setSearchKey] = useState('국립현대미술관')
	const [searchResult, setSearchResult] = useState([])
	const [resultDrawArr, setResultDrawArr] = useState([])
	// const [chktraffic, setChktraffic] = useState([])
	const [resultMarkerArr, setResultMarkerArr] = useState([])
	const [markerS, setMarkerS] = useState(null)
	const [markerE, setMarkerE] = useState(null)
	const [searchMarkers, setSearchMarkers] = useState([])


	const initMap = () => {
		const noorLat = 4522710.51119176
		const noorLon = 14147851.82614338
		const pointCng = new Tmapv2.Point(noorLon, noorLat);
		const projectionCng = new Tmapv2.Projection.convertEPSG3857ToWGS84GEO(pointCng);
		const lat = projectionCng._lat;
		const lon = projectionCng._lng;

		var center = new Tmapv2.LatLng(lat, lon)
		
		setMap(new Tmapv2.Map("map_div", {
			center : center,
			width : "70%",
			height : "545px",
			zoom : 13,
			zoomControl : true,
			scrollwheel : true,
		}))
	}

	useEffect(() => {
		initMap()
		return () => {
			setMap(null)
		}
	}, [])

	useEffect(async () => {
		if (!start || !end) {
			return
		}

		const res = await axios({
			method: 'post',
			url: "https://apis.openapi.sk.com/tmap/routes?version=1&format=json&callback=result",
			params: {
				"appKey" : process.env.REACT_APP_TMAP_API_KEY,
				"startX" : start.noorLon,
				"startY" : start.noorLat,
				"endX" : end.noorLon,
				"endY" : end.noorLat,
				"reqCoordType" : "EPSG3857",
				"resCoordType" : "EPSG3857",
				"searchOption" : 0,
				"trafficInfo" : "Y"
			}
		})

		resettingMap()

		const { data: { features:resultData } } = res
		const totalDistance = (resultData[0].properties.totalDistance / 1000).toFixed(1)
		
		const chktraffic = 
			resultData
				.filter(({geometry}) => geometry.type === "LineString")
				.map(({geometry}) => geometry.traffic)

		const positionBounds = new Tmapv2.LatLngBounds()
		const resultMarkerArr_ = []
		const resultDrawArr_ = []
		const musicCtx = []

		const _trackPathTime = resultData
			.filter(({geometry}) => geometry.type === "LineString")
			.map(({
				geometry, 
				properties
			}) => {
				const { coordinates, traffic } = geometry;
				const { time } = properties

				const intervalDistance = coordinates.reduce((acc, curr, idx) => {
					if (idx === 0) {
						return [0]
					} else {
						const [c1, c2] = coordinates[idx-1]
						const dist = Math.sqrt( Math.pow(curr[0] - c1, 2) + Math.pow(curr[1] - c2, 2) )
						return [...acc, dist]
					}
				}, [])
				const distSum = intervalDistance.reduce((acc, curr) => acc + curr, 0)
				const intervalTime = intervalDistance.map((dist, idx) => dist / distSum * time)
				const accTime = intervalTime.reduce((acc, curr, idx) => {
					if (idx === 0) {
						return [0]
					}
					return [...acc, acc[acc.length-1] + curr]
				}, [])
				accTime[accTime.length-1] = time // force sanity check

				return {
					coordinates,
					accTime
				}
			})
			console.log(_trackPathTime)
			const trackPathTime = _trackPathTime.reduce((acc, curr, idx) => {
				if (idx === 0) {
					return [curr]
				}
				const {accTime} = acc[acc.length - 1]
				const lastTime = accTime[accTime.length - 1]
				return [...acc, {
					coordinates: curr.coordinates,
					accTime: curr.accTime.map(time => time + lastTime)
				}]
			}, [_trackPathTime[0]])

		setPathMetaData(trackPathTime)
		setTrackSimulationTicker(0)


		resultData.map((item, i) => {
			const { geometry, properties } = item

			if (geometry.type === "LineString") { 

				// path information
				console.log(item)
				musicCtx.push(item)
				
				const { coordinates, traffic } = geometry
				
				const sectionInfos = coordinates.map(coord => {
					const latlng = new Tmapv2.Point(
						coord[0],
						coord[1])
					return new Tmapv2.Projection.convertEPSG3857ToWGS84GEO(latlng)
				})

				sectionInfos.map(({_lat, _lng})=> {
					positionBounds.extend(new Tmapv2.LatLng(_lat, _lng))
				})

				resultDrawArr_.push(...drawLine(sectionInfos, traffic, chktraffic)) 
			} else {
				const { coordinates } = geometry
				const { pointType } = properties
				let markerImg = ""
				let pType = ""
				if (pointType == "S") { //출발지 마커
					markerImg = "http://tmapapi.sktelecom.com/upload/tmap/marker/pin_r_m_s.png";
					pType = "S";
				} else if (pointType == "E") { //도착지 마커
					markerImg = "http://tmapapi.sktelecom.com/upload/tmap/marker/pin_r_m_e.png";
					pType = "E";
				} else { //각 포인트 마커
					markerImg = "http://topopen.tmap.co.kr/imgs/point.png";
					pType = "P"
				}

				// 경로들의 결과값들을 포인트 객체로 변환 
				const latlon = new Tmapv2.Point(
						coordinates[0],
						coordinates[1]);
				// 포인트 객체를 받아 좌표값으로 다시 변환
				const convertPoint = new Tmapv2.Projection.convertEPSG3857ToWGS84GEO(
						latlon);

				const routeInfoObj = {
					markerImage : markerImg,
					lng : convertPoint._lng,
					lat : convertPoint._lat,
					pointType : pType
				};
				// 마커 추가
				resultMarkerArr_.push(getMarkers(routeInfoObj))
			}
		})

		setResultMarkerArr(resultMarkerArr_)
		setResultDrawArr(resultDrawArr_)

		map.panToBounds(positionBounds)

		// context 중 traffic 데이터 불러오기
		const trafficData = await Promise.all(
			musicCtx.map(path => 
				{
					const { geometry, properties } = path
					const { coordinates, traffic } = geometry
					const sectionInfos = coordinates.map(coord => {
						const latlng = new Tmapv2.Point(
							coord[0],
							coord[1])
						return new Tmapv2.Projection.convertEPSG3857ToWGS84GEO(latlng)
					})
					return getTraffic(sectionInfos, traffic, chktraffic)
				}
			))
		
			/// 임의적으로 context 생성! -> 완성

		const contextData= trafficData.map((jam, index) => {
			// 바람, 산
			if (index < trafficData.length * 0.2) {
				return {"jam_high": jam.jam_high, "jam_low": jam.jam_low,
				"wt_snow": 0, "wt_rain": 0,
				"wt_cloud": 0, "wt_wind": 0, "wt_sun": 1,
				"lc_mount": 0, "lc_water": 0, "lc_city": 1,
				"lc_country": 0, "lc_highway": 0}
				}
			// 비, 도시
			else if (index < trafficData.length * 0.4) {
				return {"jam_high": jam.jam_high, "jam_low": jam.jam_low,
				"wt_snow": 1, "wt_rain": 0,
				"wt_cloud": 0, "wt_wind": 0, "wt_sun": 0,
				"lc_mount": 0, "lc_water": 0, "lc_city": 0,
				"lc_country": 1, "lc_highway": 0}
				}
			// 눈, 시골
			else if (index < trafficData.length * 0.6) {
				return {"jam_high": jam.jam_high, "jam_low": jam.jam_low,
				"wt_snow": 0, "wt_rain": 0,
				"wt_cloud": 0, "wt_wind": 1, "wt_sun": 0,
				"lc_mount": 1, "lc_water": 0, "lc_city": 0,
				"lc_country": 0, "lc_highway": 0}
				}
			// 해, 바다
			else if (index < trafficData.length * 0.7) {
				return {"jam_high": jam.jam_high, "jam_low": jam.jam_low,
				"wt_snow": 0, "wt_rain": 0,
				"wt_cloud": 1, "wt_wind": 0, "wt_sun": 0,
				"lc_mount": 0, "lc_water": 0, "lc_city": 0,
				"lc_country": 0, "lc_highway": 1}
				}
			// 비, 강가
			else if (index <= trafficData.length) {
				return {"jam_high": jam.jam_high, "jam_low": jam.jam_low,
				"wt_snow": 0, "wt_rain": 1,
				"wt_cloud": 0, "wt_wind": 0, "wt_sun": 0,
				"lc_mount": 0, "lc_water": 1, "lc_city": 0,
				"lc_country": 0, "lc_highway": 0}
				}
			}
		)

		console.log(contextData)
		/// context 저장 후 music으로 페이지 이동
		setContext(contextData)
		navigate('../music')
	}, [start, end])


	const getTraffic = async (arrPoint, traffic, chktraffic)=> {
		const jam = {jam_high: 0, jam_low: 0}

		// traffic :  0-정보없음, 1-원활, 2-서행, 3-지체, 4-정체  (black, green, yellow, orange, red)
		if (chktraffic.length != 0) {
			
			
			if (traffic != "0") {
				if (traffic.length == 0) { //length가 0인것은 교통정보가 없으므로 검은색으로 표시
					jam.jam_high = 0
					jam.jam_low = 1
				} else { //교통정보가 있음

					if (traffic[0][0] !== 0) { //교통정보 시작인덱스가 0이 아닌경우
						const tInfo = [];

						for (let z = 0; z < traffic.length; z++) {
							tInfo.push({
								"startIndex" : traffic[z][0],
								"endIndex" : traffic[z][1],
								"trafficIndex" : traffic[z][2],
							})
						}
						for (var x = 0; x < tInfo.length; x++) {

							if (tInfo[x].trafficIndex == 0) {
								jam.jam_high = 0
								jam.jam_low = 1
							} else if (tInfo[x].trafficIndex == 1) {
								jam.jam_high = 0
								jam.jam_low = 1
							} else if (tInfo[x].trafficIndex == 2) {
								jam.jam_high = 0
								jam.jam_low = 1
							} else if (tInfo[x].trafficIndex == 3) {
								jam.jam_high = 1
								jam.jam_low = 0
							} else if (tInfo[x].trafficIndex == 4) {
								jam.jam_high = 1
								jam.jam_low = 0
							}
							console.log("bb")

						}
					} else { //0부터 시작하는 경우

						const tInfo = [];

						for (let z = 0; z < traffic.length; z++) {
							tInfo.push({
								"startIndex" : traffic[z][0],
								"endIndex" : traffic[z][1],
								"trafficIndex" : traffic[z][2],
							})
						}

						for (let x = 0; x < tInfo.length; x++) {
							
							if (tInfo[x].trafficIndex == 0) {
								jam.jam_high = 0
								jam.jam_low = 1
							} else if (tInfo[x].trafficIndex == 1) {
								jam.jam_high = 0
								jam.jam_low = 1
							} else if (tInfo[x].trafficIndex == 2) {
								jam.jam_high = 0
								jam.jam_low = 1
							} else if (tInfo[x].trafficIndex == 3) {
								jam.jam_high = 1
								jam.jam_low = 0
							} else if (tInfo[x].trafficIndex == 4) {
								jam.jam_high = 1
								jam.jam_low = 0
							}
							console.log("cc")

						}
					}
				}
			}
		} else {
			// 정체
			console.log("ee")
			jam.jam_high = 1
			jam.jam_low = 0
			
		}
		// console.log(jam)
		return jam
        // const response = await instance.post('/getSong',{
        //     context_vector:  {"jam_high": jam.jam_high, "jam_low": jam.jam_low,
        //     "wt_snow": 0, "wt_rain": 1,
        //     "wt_cloud": 0, "wt_wind": 0, "wt_sun": 0,
        //     "lc_mount": 0, "lc_water": 0, "lc_city": 1,
        //     "lc_country": 0, "lc_highway": 0},
        //     weights: {"jam_high": 0, "jam_low": 0.2,
        //     "wt_snow": 0, "wt_rain": 0.5,
        //     "wt_cloud": 0, "wt_wind": 0, "wt_sun": 0,
        //     "lc_mount": 0, "lc_water": 0, "lc_city": 0.3,
        //     "lc_country": 0, "lc_highway": 0},
        //     user_name: account,
        //     song_number: 2,
        //     artists: artists,
        //     token: accessToken,
        // });
        // return {songs:response.data, jam:jam}
    }

	const resettingMap = () => {

		searchMarkers.map(marker => marker.setMap(null))
		setSearchMarkers([])


		resultMarkerArr.map(marker => {
			marker.setMap(null)
		})

		resultDrawArr.map(draw => {
			draw.setMap(null)
		})

		markerS.setVisible(false)
		markerE.setVisible(false)

		setResultMarkerArr([])
		setResultDrawArr([])
		
	}

	const getMarkers = infoObj => {
		const { pointType, lat, lng, markerImage } = infoObj
		const size = pointType === "P" ?  new Tmapv2.Size(8, 8) : new Tmapv2.Size(24, 38)//아이콘 크기 설정합니다.
		
		
		return new Tmapv2.Marker({
			position : new Tmapv2.LatLng(lat, lng),
			icon : markerImage,
			iconSize : size,
			map : map
		})
	}

	const drawLine = (arrPoint, traffic, chktraffic) => {
		const resultDrawArr_ = []
		if (chktraffic.length != 0) {

			// 교통정보 혼잡도를 체크
			// strokeColor는 교통 정보상황에 다라서 변화
			// traffic :  0-정보없음, 1-원활, 2-서행, 3-지체, 4-정체  (black, green, yellow, orange, red)
			let lineColor = '';

			if (traffic != "0") {
				if (traffic.length == 0) { //length가 0인것은 교통정보가 없으므로 검은색으로 표시
					resultDrawArr_.push(
						new Tmapv2.Polyline({
							path : arrPoint,
							strokeColor : "#06050D",
							strokeWeight : 6,
							map : map
						})
					);
				} else { //교통정보가 있음

					if (traffic[0][0] !== 0) { //교통정보 시작인덱스가 0이 아닌경우
						const tInfo = [];

						for (let z = 0; z < traffic.length; z++) {
							tInfo.push({
								"startIndex" : traffic[z][0],
								"endIndex" : traffic[z][1],
								"trafficIndex" : traffic[z][2],
							})
						}

						const noInfomationPoint = [];

						for (let p = 0; p < tInfo[0].startIndex; p++) {
							noInfomationPoint.push(arrPoint[p]);
						}

						resultDrawArr_.push(new Tmapv2.Polyline({
							path : noInfomationPoint,
							strokeColor : "#06050D",
							strokeWeight : 6,
							map : map
						}));

						for (var x = 0; x < tInfo.length; x++) {
							const sectionPoint = []; //구간선언

							for (var y = tInfo[x].startIndex; y <= tInfo[x].endIndex; y++) {
								sectionPoint.push(arrPoint[y]);
							}

							if (tInfo[x].trafficIndex == 0) {
								lineColor = "#06050D";
							} else if (tInfo[x].trafficIndex == 1) {
								lineColor = "#61AB25";
							} else if (tInfo[x].trafficIndex == 2) {
								lineColor = "#FFFF00";
							} else if (tInfo[x].trafficIndex == 3) {
								lineColor = "#E87506";
							} else if (tInfo[x].trafficIndex == 4) {
								lineColor = "#D61125";
							}

							//라인그리기[E]
							resultDrawArr_.push(
								new Tmapv2.Polyline({
									path : sectionPoint,
									strokeColor : lineColor,
									strokeWeight : 6,
									map : map
								})
							);
						}
					} else { //0부터 시작하는 경우

						const tInfo = [];

						for (let z = 0; z < traffic.length; z++) {
							tInfo.push({
								"startIndex" : traffic[z][0],
								"endIndex" : traffic[z][1],
								"trafficIndex" : traffic[z][2],
							})
						}

						for (let x = 0; x < tInfo.length; x++) {
							const sectionPoint = []; //구간선언

							for (let y = tInfo[x].startIndex; y <= tInfo[x].endIndex; y++) {
								sectionPoint.push(arrPoint[y]);
							}

							if (tInfo[x].trafficIndex == 0) {
								lineColor = "#06050D";
							} else if (tInfo[x].trafficIndex == 1) {
								lineColor = "#61AB25";
							} else if (tInfo[x].trafficIndex == 2) {
								lineColor = "#FFFF00";
							} else if (tInfo[x].trafficIndex == 3) {
								lineColor = "#E87506";
							} else if (tInfo[x].trafficIndex == 4) {
								lineColor = "#D61125";
							}

							resultDrawArr_.push(
								new Tmapv2.Polyline({
									path : sectionPoint,
									strokeColor : lineColor,
									strokeWeight : 6,
									map : map
								})
							);
						}
					}
				}
			} else {

			}
		} else {
			resultDrawArr_.push(
				new Tmapv2.Polyline({
					path : arrPoint,
					strokeColor : "#DD0000",
					strokeWeight : 6,
					map : map
				})
			)
		}
		return resultDrawArr_
	}

	const handleChange = (e) => {
		setSearchKey(e.target.value)
	}

	const handleSubmit = async (event) => {
		event.preventDefault();
		
		searchMarkers.map(marker => marker.setMap(null))
		setSearchMarkers([])

		const response = await axios({
			method: 'get',
			url: 'https://apis.openapi.sk.com/tmap/pois?version=1&format=json&callback=result',
			params: {
				"appKey" : process.env.REACT_APP_TMAP_API_KEY,
				"searchKeyword" : searchKey,
				"resCoordType" : "EPSG3857",
				"reqCoordType" : "WGS84GEO",
				"count" : 10
			}
		})
		const result = response.data.searchPoiInfo.pois.poi
		setSearchResult(result)
		const positionBounds = new Tmapv2.LatLngBounds()
		
		setSearchMarkers(result.map((data, k) => {
			const name = data.name

			const markerPosition = getPositionFromData(data)

			const marker = new Tmapv2.Marker({
				position : markerPosition,
				icon : `http://tmapapi.sktelecom.com/upload/tmap/marker/pin_b_m_${k}.png`,
				iconSize : new Tmapv2.Size(24, 38),
				title : name,
				map:map
			})
			
			positionBounds.extend(markerPosition)
			
			return marker
		})) 

		map.panToBounds(positionBounds)

	};

	const handleStartSetting = (data) => {

		setStart(data)
		const markerPosition = getPositionFromData(data)

		if(markerS !== null) {
			markerS.setMap(null)
		}
		
		setMarkerS(new Tmapv2.Marker(
			{
				position : markerPosition,
				icon : "http://tmapapi.sktelecom.com/upload/tmap/marker/pin_r_m_s.png",
				iconSize : new Tmapv2.Size(24, 38),
				map : map,
			}))
	}

	const handleEndSetting = (data) => {
		
		setEnd(data)
		const markerPosition = getPositionFromData(data)

		if(markerE !== null) {
			markerE.setMap(null)
		}
		
		setMarkerE(new Tmapv2.Marker(
			{
				position : markerPosition,
				icon : "http://tmapapi.sktelecom.com/upload/tmap/marker/pin_r_m_e.png",
				iconSize : new Tmapv2.Size(24, 38),
				map : map,
			}))

	}

	const getPositionFromData = data => {
		const noorLat = Number(data.noorLat)
		const noorLon = Number(data.noorLon)

		const pointCng = new Tmapv2.Point(noorLon, noorLat)
		const projectionCng = new Tmapv2.Projection.convertEPSG3857ToWGS84GEO(pointCng)
		const lat = projectionCng._lat
		const lon = projectionCng._lng

		return new Tmapv2.LatLng(lat, lon)
		
	}
	

	return (
		<React.Fragment>
			<header>
				<div className="header-title">
					PER.PL
				</div>
			</header>

			<Navigation id = "navigation">
				
				<SearchBox id="searchResult">
					<div className = "search-box">
						<ChosenLocation 
							label="출발"
							location={start && start.name}
						/>
						<ChosenLocation 
							label="도착"
							location={end && end.name}
						/>
					</div>
					<form className = "location-input-box" onSubmit={handleSubmit}>
						<input className = "location-input" type="text"
							value={searchKey} 
							onChange={handleChange}/>	
						<button className = "location-input-button" type="submit">검색</button>
					</form>
					<ResultList>
						{searchResult ? 
							searchResult.map(
								(result, idx) => (
								<ResultList.Item>
									<img src={`http://tmapapi.sktelecom.com/upload/tmap/marker/pin_b_m_${idx}.png`}/>
									<div className="location-item">{result.name}</div>
									<button className = "choose-start" onClick={() => handleStartSetting(result)}>출발</button>
									<button className = "choose-end" onClick={() => handleEndSetting(result)}>도착</button>
								</ResultList.Item>
								))
							: '검색 결과'
						}

					</ResultList>
				</SearchBox>
				<div id="map_div"></div>
			</Navigation>
		</React.Fragment>
	)
}


const ChosenLocation = ({label, location}) => {
	return (
		<div className="chosen-location">
			<span className="chosen-location-label">{label}</span>
			<span className="chosen-location-location">{location}</span>	
		</div>
	)
}