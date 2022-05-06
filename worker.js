import * as files from "./js/files.js"

var loc=new URL(location.href)
loc.pathname=loc.pathname.slice(0,-9)
function createResp(rinf,type,...val){
	return Promise.resolve(new Response(new Blob(val,{type}),rinf))
}

var createErr=url=>createResp({},"text/html",url+" not found")


//A helper function to convert IDBRequest objects into Promises.
function waitFor(req){
    if(req.readyState=="done")return req.result
    return new Promise((res,rej)=>{
        req.onsuccess=e=>res(req.result)
        req.onerror=e=>rej(req.error)
    })
}

addEventListener("install",e=>{
	console.log("installed")
	caches.open("cache").then(c=>c.addAll(["index.html","css/index.css","js/index.js","js/files.js","worker.js"]))
})

addEventListener("active",e=>{
	console.log("active")
})

//Fetch event handler
addEventListener("fetch",e=>{
	let url=new URL(e.request.url)
	if(url.pathname.startsWith(loc.pathname+"test/")){
		e.respondWith((async res=>{
			//Delegate to simulated filesystem
			let filePath=url.pathname.slice(loc.pathname.length+4)

			if(filePath.endsWith("/")){//folder
				let indexFile=await files.getFile(filePath+"index.html")
				return new Response(indexFile.content)
			}
			let retrievedFile=await files.getFile(filePath)

			//console.log(retrievedFile)
			if(retrievedFile.type=="file"){
				return new Response(retrievedFile.content)
			}else{
				return new Response("add trailing slash")
			}
		})().catch(a=>{
			console.log(a)
			return createErr(e.request.url)
		}))
	}else{
		e.respondWith(caches.open("cache")
			.then(che=>fetch(e.request)
			.then(a=>{
				if(a.ok){
					che.put(e.request,a.clone())
					return a
				}
				che.delete(e.request)
				return createErr(url)
			},a=>che.match(e.request)
			.then(mch=>mch||createErr(url))
		)))
	}
	//e.createRespondWith(new createResponse("Page visit #"+ ++a))
})
