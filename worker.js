var loc=new URL(location.href)
loc.pathname=loc.pathname.slice(0,-9)
function createResp(rinf,type,...val){
	return Promise.resolve(new Response(new Blob(val,{type}),rinf))
}

createErr=url=>createResp({},"text/html",url+" not found")


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
	caches.open("cache").then(c=>c.addAll(["index.html","create.html","js/create.js","worker.js"]))
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

			let sysdb=await waitFor(indexedDB.open("filesys"))
			let trans=sysdb.transaction("files")
			let os=trans.objectStore("files")
			let retrievedFile=await waitFor(os.get(filePath))
			//console.log(retrievedFile)
			return new Response(retrievedFile.content)
		})().catch(a=>{
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
