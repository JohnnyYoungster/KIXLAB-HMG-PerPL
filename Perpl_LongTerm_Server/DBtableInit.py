import mysql.connector

## DB table creator -> don't need to execute anymore
## Needed libraries: mysql

try:
    connection = mysql.connector.connect(
        ## INSERT YOUR DB HOST HERE
    )
    mycursor = connection.cursor()
    mycursor.execute("CREATE TABLE users(id INT PRIMARY KEY, name VARCHAR(255), preference JSON)")

    if connection.is_connected():
        connection.close()
except mysql.connector.Error as error:
    print("Failed to create table in MySQL: {}".format(error))