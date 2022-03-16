import spotipy
from spotipy.oauth2 import SpotifyClientCredentials,SpotifyOAuth
from flask import Flask
from flask_cors import CORS, cross_origin
from flask import request, render_template, send_file
import json
import random

from youtube_dl import YoutubeDL
## request handler
## Needed libraries: spotipy, flask, json

import re
from urllib import request as rq

SPOTIPY_CLIENT_ID = 'INSERT_CLIENT_ID'
SPOTIPY_CLIENT_SECRET = 'INSERT_CLIENT_SECRET'
SPOTIPY_REDIRECT_URI = 'INSERT_REDIRECT_URI'
SCOPE = 'user-library-read'
client_credentials_manager = SpotifyClientCredentials(client_id=SPOTIPY_CLIENT_ID,
                                                      client_secret=SPOTIPY_CLIENT_SECRET)

sp = spotipy.Spotify(client_credentials_manager=client_credentials_manager)

### For reference ###
contexts=["jam_high","jam_low",
      "wt_snow","wt_rain",
           "wt_cloud","wt_wind","wt_sun",
      "lc_mount","lc_water", "lc_city",
           "lc_country", "lc_highway"]
music_features = ['acousticness', 'instrumentalness',
             'liveness', 'speechiness',
             'danceability',
             'energy','valence']

import mysql.connector

def get_connection():
    try:
        connection = mysql.connector.connect(
            ## INSERT YOUR DB HOST HERE
        )
        mycursor = connection.cursor()
    except mysql.connector.Error as error:
        print("Failed to create table in MySQL: {}".format(error))
    return mycursor, connection



def get_song(context_vector, weights, seed_genres, userName, songNum, banlist):
    ### Context Vector: 12 dimension context vector dictionary
    ### Weights: 12 weights dictionary for each vector
    ### Seed Genres: List of genre strings
    ### UserID: userID to look into DB.
    ### songNum: Number of songs to search

    stats = {'acousticness': 0, 'instrumentalness': 0,
             'liveness': 0, 'speechiness': 0,
             'danceability': 0,
             'energy': 0, 'valence':0}

    sql = "SELECT * FROM users WHERE name LIKE '"+userName+"'"
    mycursor, connection=get_connection()
    mycursor.execute(sql)
    result=mycursor.fetchall()
    if len(result)==0:
        sql = "SELECT * FROM users WHERE name LIKE 'ref0'"
        mycursor.execute(sql)
        result=mycursor.fetchall()
    else:
        data=json.loads(result[0][2])
        hasData=True
        hasDataThreshold=1
        for i in data:
            if(context_vector[i]*weights[i]>0):
                try:
                    row=json.loads(data[i])
                except:
                    row=data[i]
                if (row["n"]==0): 
                    hasData=False
                    # print("Not enough data")
                    break
        if(not hasData):
            pointerName=result[0][3]
            sql = "SELECT * FROM users WHERE name LIKE '" + pointerName + "'"
            mycursor.execute(sql)
            result = mycursor.fetchall()
            
    data=json.loads(result[0][2])
    for i in data:
        try:
            data[i]=json.loads(data[i])
        except:
            data[i]=data[i]

    for i in data:
        context=data[i]
        for comp in stats:
            stats[comp]+=context[comp]*weights[i]*context_vector[i]
    print(stats)

    songNumMargin=3
    songRequestNum=len(banlist)+songNumMargin+songNum
    playlist=sp.recommendations(seed_genres=seed_genres, target_valence=stats['valence'],
                       target_acousticness=stats['acousticness'],
                       target_instrumentalness=stats['instrumentalness'],
                       target_liveness=stats['liveness'], target_speechiness=stats['speechiness'],
                       target_danceability=stats['danceability'],
                       target_energy=stats['energy'],limit=songRequestNum, min_popularity=5)
    tracks = playlist["tracks"]
    songs=[]
    songNames=[]
    songStats=[]
    songWeights=[]
    count=0
    for track in tracks:
        id = track["id"]
        if (id in banlist): continue
        songs.append(id)
        name=track["name"]
        songNames.append(name)
        features = sp.audio_features(tracks=[id])
        songStat = {'acousticness': 0, 'instrumentalness': 0,
                     'liveness': 0, 'speechiness': 0,
                     'danceability': 0,
                     'energy': 0, 'valence': 0
                     }
        for comp in songStat:
            songStat[comp]=features[0][comp]
        songStats.append(json.dumps(songStat))
        songWeights.append(weights)
        count+=1
        if count>songNum+songNumMargin:
            break
    connection.close()
    return {"songs": songs[:songNum+songNumMargin], "songNames":songNames[:songNum+songNumMargin],
    "music_vector":json.dumps(stats), "songStats":songStats[:songNum+songNumMargin],
    "songWeights": songWeights[:songNum+songNumMargin]}

def like_song(context_vector, weights, songID, userName):
    mycursor, connection=get_connection()
    features = sp.audio_features(tracks=[songID])
    sql = "SELECT * FROM users WHERE name LIKE '" + userName + "'"
    mycursor.execute(sql)
    result = mycursor.fetchall()
    currentMat=dict()
    # print(features[0])
    # print(weights)
    # print(context_vector)
    if(len(result)!=0):
        ### User data exists in DB, and needs updating.
        data = json.loads(result[0][2])
        for i in data:
            try:
                data[i]=json.loads(data[i])
            except:
                data[i]=data[i]
        for i in data:
            if(context_vector[i]==0): 
                currentMat[i]={'acousticness': 0, 'instrumentalness': 0,
                     'liveness': 0, 'speechiness': 0,
                     'danceability': 0,
                     'energy': 0, 'valence': 0,
                     'n': 0
                     }
                continue 
            context = data[i]
            num_songs=context['n']
            for comp in music_features:
                context[comp] = ( context[comp] * num_songs
                                 + features[0][comp]*weights[i])/(num_songs+weights[i])
            context['n']+=weights[i]
            data[i]=json.dumps(context)
            currentMat[i]=context
        jsonWrapper=json.dumps(data)
        sql="UPDATE users SET preference = %s WHERE name = %s"
        mycursor.execute(sql, (jsonWrapper, userName))
        connection.commit()
    else:
        ### If this is the first time user has liked a song
        wrapper=dict()
        for i in contexts:
            stats = {'acousticness': 0, 'instrumentalness': 0,
                     'liveness': 0, 'speechiness': 0,
                     'danceability': 0,
                     'energy': 0, 'valence': 0,
                     'n': 0
                     }
            if(weights[i]*context_vector[i]!=0):
                stats['n']=weights[i]
                for comp in music_features:
                    stats[comp]=features[0][comp]
            wrapper[i]=json.dumps(stats)
            currentMat[i]=stats
        jsonWrapper=json.dumps(wrapper)
        sql = "INSERT INTO users (name, preference) VALUES (%s, %s)"
        mycursor.execute(sql,(userName,jsonWrapper))
        connection.commit()

    sql = "SELECT * FROM users WHERE name LIKE '" + userName + "'"
    mycursor.execute(sql)
    result = mycursor.fetchall()
    if(result[0][3]!=result[0][1]):
        ### Update pointer reference if matrix is not full
        sql = "SELECT * FROM users WHERE name != %s AND name = pointer"
        mycursor.execute(sql,[userName])
        result = mycursor.fetchall()
        minDist=100
        minPointer=result[0][3]
        isFull=True
        for candidate in result:
            data = json.loads(candidate[2])
            curDist=0
            for i in currentMat:
                vector=currentMat[i]
                context=json.loads(data[i])
                if vector['n']==0: 
                    isFull=False
                    continue
                for comp in music_features:
                    curDist+=(vector[comp]-context[comp])**2
            if curDist<minDist:
                minDist=curDist
                minPointer=candidate[1]
        if (isFull):
            sql="UPDATE users SET pointer = %s WHERE name = %s"
            mycursor.execute(sql, (userName, userName))
            connection.commit()
        else:
            if(minPointer!=userName):
                sql="UPDATE users SET pointer = %s WHERE name = %s"
                mycursor.execute(sql, (minPointer, userName))
                connection.commit()
    

# UPLOAD_FOLDER = 'C:/Users/yohan/Documents/hmg-server'
app = Flask(__name__)
cors = CORS(app,resources={r"/*": {"origins": "*"}})
app.config['CORS_HEADERS'] = 'Content-Type'
# app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
@app.route('/')
def home():
    return "Welcome Home"

@app.route('/getSong', methods=['POST'])
def get():
    jsonObj=request.json
    print(jsonObj)
    context_vector = jsonObj['context_vector']
    weights = jsonObj['weights']
    userName=jsonObj['user_name']
    songNum=jsonObj['song_number']
    artists=jsonObj['artists']
    if 'banlist' in jsonObj:
        banlist=jsonObj['banlist']
    else:
        banlist=[]
    genres=[]
    for artist in artists:
        genres+=sp.artist(artist)['genres']
    seeds=sp.recommendation_genre_seeds()['genres']
    genres= [g for g in genres if g in seeds]
    if(len(genres)>0):
        rg=random.sample(genres,min(len(set(genres)),5))
    else:
        rg=["k-pop","classic","jazz","pop"]
    # rg=["k-pop","classic","pop"]
    return get_song(context_vector,weights,rg,userName,songNum,banlist)

@app.route('/download', methods=['GET'])
@cross_origin()
def download():
    # app.logger.info("data: %s",request.json['testInput'])
    songID=request.args.get("songID")
    songName=sp.track(songID)["name"].replace(" ", "")
    artistName=sp.track(songID)["artists"][0]["name"].replace(" ", "")
    print(songName, artistName)
    html = rq.urlopen(
    f"https://www.youtube.com/results?search_query={songName+artistName}"
    )
    video_ids = re.findall(r"watch\?v=(\S{11})", html.read().decode())
    path=app.instance_path
    with YoutubeDL({
            "format": "bestaudio/mp3",
            "outtmpl": f"{path}/{songID}.mp3",
            "ignoreerrors": True,
            "postprocessors": [
                {
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "mp3",
                    "preferredquality": "320",
                }
            ],
        }) as ydl:
        if video_ids:
            url = "https://www.youtube.com/watch?v=" + video_ids[0]
            print(url)
            metadata = ydl.extract_info(url, download=False)
            downloaded_track = ydl.download([url])
    print(path)
    return send_file(path+"/"+songID+".mp3",mimetype="audio/mp3")

@app.route('/like', methods=['POST'])
def like():
    jsonObj=request.json
    context_vector = jsonObj['context_vector']
    weights = jsonObj['weights']
    userName=jsonObj['user_name']
    songNum=jsonObj['song_number']
    like_song(context_vector,weights,songNum,userName)
    return "Success"

@app.route('/getSleep', methods=['GET'])
@cross_origin()
def getSleep():
    pl=sp.playlist(playlist_id="37i9dQZF1DWYcDQ1hSjOpY")
    tracks=pl["tracks"]["items"]
    songs=[]
    songNames=[]
    for track in tracks:
        if(track==None): 
            continue
        if(track["track"]==None): 
            continue
        id=track["track"]["id"]
        name=track["track"]["name"]
        songs.append(id)
        songNames.append(name)
    return {"songs": songs, "songNames":songNames}

# if __name__ == '__main__':
#     app.run()