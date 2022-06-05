import express from 'express';
import path from 'path';
import multer from "multer";
import https from "https"
import http from "http"
import fs from "fs"

import { FilesDatabase } from './database';
import { IErrorPage, ILinkPage, IUploadPage } from './Pages';

const viewsPath = path.normalize(`${__dirname}/../views`)

const config = require('dotenv').config()

export const app = express()
app.use(express.json())
app.use(express.urlencoded({
	extended: true
}))
app.set('views', viewsPath)
app.set('view engine','pug')

const filesPath = path.normalize(`${__dirname}/../files`)
const fileFieldName = "filetoupload"
const supportedMymeTypes = ["application/zip","application/x-zip-compressed","application/zip-compressed"]

const charAmount = 8

const serverConfig = {
	hostname: 			process.env.hostname || "127.0.0.1",
	serverPort: 		Number(process.env.serverPort) || 3000,
	totalStorage: 		process.env.totalStorage || "",
	fileSizeLimit:		process.env.fileSizeLimit || "",
	secure: 			process.env.secure || "",
	certPath: 			process.env.certPath || "",
	privateKeyPath: 	process.env.privateKeyPath || "",
	adminkey: 			process.env.adminkey || "",
	logourl: 			process.env.logourl || ""
}

const storage = multer.diskStorage({
	destination: function(req, file, cb) {
		cb(null,filesPath)
	},
	filename: function(req,file,cb){	
		const filename = new Date().getTime().toString()

		cb(null,filename)
	}
	
})

const upload = multer({
	storage:storage,
	fileFilter: async (req,file,cb)=>{
		if(supportedMymeTypes.includes(file.mimetype))
		{
			const fileSize = Number(req.headers["content-length"]) 
			
			let space = await getRemaingSpace().then(res=>res)
			console.log("space on server",space,"file size",fileSize,"result:",space - fileSize)

			if((space - fileSize) <= 0)
			{
				cb(null,false)
				return cb(new Error("There is not enough space in our server to save your file."))
			}
			console.log(req.ip,"uploaded",file.originalname,file.mimetype)

			cb(null,true)
		}
		else{
			cb(null,false)
			return cb(new Error("Only .zip supported"))
		}
	},
	limits: {
		fileSize: Number(serverConfig.fileSizeLimit) 
	}
}).single(fileFieldName)

app.get('/',async (req,res)=>{
	const fileAmountNow = await db.getFileAmount().then(res=>res)
	const storageSize = await db.getStorageSize().then(res=>res)
	const remainingSpace = await getRemaingSpace()/(1024*1024)
	const filesize = Number(serverConfig.fileSizeLimit)/(1024*1024)

	const uploadPage: IUploadPage ={
		title:"Temp-Upload",
		logoImage:serverConfig.logourl,
		uploadUrl:"/upload",
		fieldName: fileFieldName,
		emptySpace: remainingSpace.toString(),
		fileAmountNOW: fileAmountNow.toString(),
		fileAmountALL:"0",
		fileSize: filesize.toString()
	}
	
	res.render('upload',uploadPage)

})

app.post('/upload',async (req,res)=>{
	upload(req,res, async (err)=>{
		if(err){
			const error:IErrorPage= {
				errorMessage: err.message
			}
			res.render('error',error)
		}
		else{
			if(req.file && req.body.password)
			{
				const secret = await db.getRandomFileName(charAmount)
				await db.addFile({
					filename: req.file.filename ,
					filesize: req.file.size,
					password: req.body.password,
					secretname: secret,
					originalname: req.file.originalname
				}).then((added)=>{
					if(added){
						console.log(req.file?.filename,"added to db")

						const conf:ILinkPage = {
							link:`${serverConfig.hostname}:${serverConfig.serverPort}/${secret}/${req.body.password}`
						}

						res.render('linkpage',conf)
					}
					else{
						res.send("erro")
					}
				})
			}
			else{
				res.render('uploaderr',{error:"no password"})
			}
		}
	})
})

app.get('/db',async (req,res)=>{
	await db.getWholeTable().then((rows)=>{
		if(rows.length > 0)
		{
			res.json(rows)
		}
		else{
			res.send("Empty.")
		}
	})
})

app.get('/:secret/:pass', async (req,res)=>{

	await db.getFile(req.params.secret,req.params.pass).then((file)=>{
		if(file)
		{
			const downloadLink = `${filesPath}/${file.filename}`

			res.download(downloadLink,file.originalname,(err)=>{
				if(err) console.error(err)
				fs.unlink(downloadLink,(errdownload)=>{
					if(errdownload) console.error(errdownload)
					else{
						
						console.log(file.filename,"deleted from files.")
					}
				})
				console.log(file.filename,"was downloaded")
			})

			db.removeFile(req.params.secret).then((removed)=>{
				console.log(`removed from DB? ${removed}`)
			})

		}
		else{
			res.send(`Wrong password or file doesn't exist`)
		}
	})
})

export const db = new FilesDatabase(path.normalize(`${__dirname}/../data.db`))

db.tryToCreateTable().then((res)=>{
	console.log("created new table?",res)
})

if('1' === process.env.secure){
	const config:https.ServerOptions = {
		cert:  serverConfig.certPath,
		key: serverConfig.privateKeyPath
	}
	const server = https.createServer(config,app)

	server.listen(serverConfig.serverPort,serverConfig.hostname,()=>{
	})
}
else{
	const server = http.createServer(app)

	server.listen(serverConfig.serverPort,serverConfig.hostname || "localhost",()=>{
		console.log("Temp-upload webserver running on:",server.address())
	})
}

async function getRemaingSpace(){
	const storageSize = await db.getStorageSize().then(res=>res)
	const remainingSpace = Number(serverConfig.totalStorage) - storageSize

	return remainingSpace
}