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
# playlistIDs=["37i9dQZF1DX4NsREGkRuCe","4rwIRBOxOaaSX2NwrJSoiV",
#              "37i9dQZF1DWVbb8LK4P3Mg","37i9dQZF1DXbpaEv4bXhFx",
#              "7zzQIKEsu9SlTwRB1T8b8s", "61O0b8YBdpfTIDXgzOxQnm","37i9dQZF1DWY9pVDnNPGPE",
#              "4cT4uyg9JARPVEAdBrBMUk", "69P0d9bOmwxR1ip2H1sjzC","6wJYkUxvzoRz0ZLSczD3I7",
#              "37i9dQZF1DX13ZzXoot6Jc", "37i9dQZF1DXdF699XuZIvg"]
jam_high=["37i9dQZF1DX4NsREGkRuCe","0mY9BQvlpraYLzg9BfKuVa","0JJ0havv93WjsPsxXtIdeG","3w5xrSNIsRgiKMvt3X34ey"]
jam_low=["4rwIRBOxOaaSX2NwrJSoiV","3BByG2ApfHrsgVi17Jy1kc","7i9OhVq6qI856kXNC2FdqR","5F0sGC2LxNqKzr9QitODSF"]
wt_snow=["37i9dQZF1DWVbb8LK4P3Mg","2JSn2M0DFwcfCMuYogXiu7","0P2hlnIrtJPufKz1FRiaAd","6gNZoFHaKhusArUeqIv6tt"]
wt_rain=["37i9dQZF1DXbpaEv4bXhFx","37i9dQZF1DWYxwmBaMqxsl","7fOSx44aUq53XWRivEZqcx","3wDHFJ68hV2KrLEfDEDmfK"]
wt_cloud=["7zzQIKEsu9SlTwRB1T8b8s","3oh3NmpgHy2leLcu7oobAr","64SBCis2hMxCJFBiUY4w0u","6cQikvBTHpNlXUEmhsLIb2"]
wt_wind=["61O0b8YBdpfTIDXgzOxQnm","5vAuUpKJN4iUVhFSYjJevi","76N1KRYidYGw0V072QIwD5"]
wt_sun=["37i9dQZF1DWY9pVDnNPGPE","2L7ITJDRWIVNkxNq8qhI30","4jDK6dg6QeLG7cp7ErS1tX","69pkbBraIGFlJOi21CEN80"]
lc_mount=["4cT4uyg9JARPVEAdBrBMUk","0dzuVoRrDKaTKTik1jGY4p","7EQBBx2UU6QJuaS6pPeARW","3TIxgCFOLGB3dd3hbhRZim","7blHnxFW3CLP8OOzaVJ2R1"]
lc_water=["69P0d9bOmwxR1ip2H1sjzC","3QOZf23rCHjOePStLbC7ci","4mBXBXvBFqjdywZsbbm7b2","37i9dQZF1DWV90ZWj21ygB","67ZDF8zjAtcEsDzUawf3UV"]
lc_city=["6wJYkUxvzoRz0ZLSczD3I7","25ys46ACThmzpv3x6rhHlA","15z8g3vzl1GXpDQXVhMKMR","14egzeN5LQCQgLfqqfagvI","45B6gLngZYHY5IMqUq1TgC"]
lc_country=["37i9dQZF1DX13ZzXoot6Jc","56Dk17Ih72MgaAxk8UomYA","4yXDxl6UrMSlngByMWZmj3","4c8pconVlhibtqfaxOzQ4C","3VsybKokojcbfZHxqWqqAq"]
lc_highway=["37i9dQZF1DXdF699XuZIvg","3VXlLf4PfUAaIIW40vehLP","6NZEZ9bZbvifc4SwaISpDt","5Ws8K5VoM45TP0S1OiLH46"]
playlistIDList=[jam_high,jam_low,wt_snow,wt_rain,
                wt_cloud,wt_wind,wt_sun,lc_mount,lc_water
                    ,lc_city,lc_country,lc_highway]


matrix=[None]*len(playlists)
for i in range(len(playlistIDList)):
    stats = {'acousticness': 0, 'instrumentalness': 0,
             'liveness': 0, 'speechiness': 0,
             'danceability': 0,
             'energy': 0, 'valence':0, 'tempo':0}
    totalnum=0
    for id in playlistIDList[i]:
        pl=sp.playlist(playlist_id=id)
        # pls=sp.playlist
        tracks=pl["tracks"]["items"]
        noneNum=0
        for track in tracks:
            if(track==None): 
                noneNum+=1
                continue
            if(track["track"]==None): 
                noneNum+=1
                continue
            id=track["track"]["id"]
            if(id==None): 
                noneNum+=1
                continue
            features = sp.audio_features(tracks=[id])
            if(features[0]==None): 
                noneNum+=1
                continue
            for stat in stats:
                # stats[stat]+=features[0][stat]/len(tracks)
                stats[stat]+=features[0][stat]
        totalnum+=len(tracks)-noneNum
    for stat in stats:
        stats[stat]/=totalnum
    print(stats)
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
    mycursor.execute("INSERT INTO users (name, preference) VALUES (%s, %s)",("ref0",jsonWrapper))
    connection.commit()
    print(mycursor.rowcount, "record inserted")
except mysql.connector.Error as error:
    print("Failed to create table in MySQL: {}".format(error))