import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
# import pandas as pd
import json

## reference matrix creator -> don't need to execute anymore
## Needed libraries: spotipy, json

SPOTIPY_CLIENT_ID = 'INSERT_CLIENT_ID'
SPOTIPY_CLIENT_SECRET = 'INSERT_CLIENT_SECRET'
SPOTIPY_REDIRECT_URI = 'INSERT_REDIRECT_URI'
client_credentials_manager = SpotifyClientCredentials(client_id=SPOTIPY_CLIENT_ID, client_secret=SPOTIPY_CLIENT_SECRET)

sp = spotipy.Spotify(client_credentials_manager=client_credentials_manager)


stats={'acousticness':0,'instrumentalness':0,
       'liveness':0,'speechiness':0,
       'danceability':0,
       'energy':0, 'valence':0}
column=list(stats.keys())
# print(column)
playlists=["jam_high","jam_low",
      "wt_snow","wt_rain",
           "wt_cloud","wt_wind","wt_sun",
      "lc_mount","lc_water", "lc_city",
           "lc_country", "lc_highway"]
wrapper=dict()
# for i in playlist:
#     wrapper[playlists]
playlistIDs=["37i9dQZF1DX4NsREGkRuCe","4rwIRBOxOaaSX2NwrJSoiV",
             "37i9dQZF1DWVbb8LK4P3Mg","37i9dQZF1DXbpaEv4bXhFx",
             "7zzQIKEsu9SlTwRB1T8b8s", "61O0b8YBdpfTIDXgzOxQnm","37i9dQZF1DWY9pVDnNPGPE",
             "4cT4uyg9JARPVEAdBrBMUk", "69P0d9bOmwxR1ip2H1sjzC","6wJYkUxvzoRz0ZLSczD3I7",
             "37i9dQZF1DX13ZzXoot6Jc", "37i9dQZF1DXdF699XuZIvg"]
matrix=[None]*len(playlists)
for i in range(len(playlistIDs)):
    stats = {'acousticness': 0, 'instrumentalness': 0,
             'liveness': 0, 'speechiness': 0,
             'danceability': 0,
             'energy': 0, 'valence':0}
    pl=sp.playlist(playlist_id=playlistIDs[i])
    tracks=pl["tracks"]["items"]
    # print(len(tracks))
    for track in tracks:
        id=track["track"]["id"]
        features = sp.audio_features(tracks=[id])
        for stat in stats:
            stats[stat]+=features[0][stat]/len(tracks)
    matrix[i]=stats
    wrapper[playlists[i]]=json.dumps(stats)

# ### Save as csv
# df1 = pd.DataFrame(matrix, index = playlists, columns=column)
# df1.to_csv("refMat.csv",sep=',',na_rep="NaN")

### Save to database
import mysql.connector

try:
    connection = mysql.connector.connect(
        ## INSERT YOUR DB HOST HERE
    )
    mycursor = connection.cursor()
    jsonWrapper=json.dumps(wrapper)
    mycursor.execute("INSERT INTO users (name, preference) VALUES (%s, %s)",("ref1",jsonWrapper))
    connection.commit()
    print(mycursor.rowcount, "record inserted")
except mysql.connector.Error as error:
    print("Failed to create table in MySQL: {}".format(error))