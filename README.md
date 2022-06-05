# temp-upload

Web server to upload files temporally and privately.  
You can upload a .zip file and it will return a link. When you go to this link you will download the file, and the file will be removed from the server.  

Example video: https://youtu.be/JLm1ck4XnWM

# How to host by yourself

- clone this repo
- run `npm install`
- modify the `.env` file with your own stuff
	- `secure=0` means no HTTPS. `secure=1` means with HTTPS.
	- `totalStorage=5368709120` means you can only save 5 GigaBytes of data.
	- `fileSizeLimit=52428800` means the file size limit its 50 MegaBytes.
- run `npm run compile` to compile the typescript code
- run `npm run start` to start hosting the website

After that, you are good to go.  

# TODO

- admin page to update or delete files
- docker image
