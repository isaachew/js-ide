import * as files from "./js/files.js"

var loc=new URL(location.href)
loc.pathname=loc.pathname.slice(0,-9)//remove "worker.js"
function createResp(rinf,type,...val){
	return Promise.resolve(new Response(new Blob(val,{type}),rinf))
}

var createErr=url=>createResp({status:404,statusText:"Not Found"},"text/html",url+" not found")

var cacheUrls=["index.html","css/index.css","js/index.js","js/files.js","worker.js"]

addEventListener("install",e=>{
	console.log("installed")
	caches.open("cache").then(c=>c.addAll(cacheUrls))
})

addEventListener("active",e=>{
	console.log("active")
})

//Fetch event handler
addEventListener("fetch",e=>{
    console.log("intercepted",e)
	let url=new URL(e.request.url)
	if(url.pathname.startsWith(loc.pathname+"test")){
		e.respondWith((async res=>{
			//Delegate to simulated filesystem
			let filePath=decodeURIComponent(url.pathname.slice(loc.pathname.length+4))
			console.log(filePath)
			if(filePath.endsWith("/")){//folder
				let indexFile=await files.getEntry(filePath+"index.html")
				return new Response(indexFile.content)
			}
			let retrievedFile=await files.getEntry(filePath)

			//console.log(retrievedFile)
            if(!retrievedFile){//no file
                return createErr(e.request.url)
            }
			if(retrievedFile.type=="file"){
				return new Response(retrievedFile.content)
			}else{
				return new Response("add trailing slash")
			}
		})().catch(a=>{
			console.log(a)
			return createErr(e.request.url)
		}))
	}else if(e.request.url.startsWith(loc)){
        console.log("in domain")
        e.respondWith(caches.open("cache")
			.then(che=>fetch(e.request)
			.then(a=>{
				if(a.ok){
					che.put(e.request,a.clone())
					return a
				}
				che.delete(e.request)
				return a
			},a=>che.match(e.request)
			.then(mch=>mch||createErr(url))
		)))

	}else{
        console.log("not in domain")
    }
	//e.createRespondWith(new createResponse("Page visit #"+ ++a))
})
