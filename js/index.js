import * as files from "./files.js"
var worker=null
let previewDir="./test/firstdir.html"
navigator.serviceWorker.getRegistration().then(e=>{
	worker=e.active

})




async function openFile(path){
	document.getElementById("fs").value=path
	let file=await files.getFile(path)
	if(!file||file.type=="folder")return


	document.getElementById("frame").src=previewDir


	document.getElementById("ta").value=await file.content.text()



}

document.getElementById("fs").addEventListener("change",e=>{
	openFile(e.target.value)
})

document.getElementById("folderCreate").addEventListener("click",a=>{
	files.createFolder(document.getElementById("folderLocation").value)
})

async function save(e){

	files.updateFile(document.getElementById("fs").value,[document.getElementById("ta").value])
	document.getElementById("frame").contentWindow.location.reload()




}
document.getElementById("save").addEventListener("click",save)


async function expandFolder(el,dir){
	let folder=await files.getFile(dir)
	for(let i in folder.content){
		let fileEl=document.createElement("div")
		fileEl.className=folder.content[i].type+"entry"
		if(folder.content[i].type=="folder"){
			let folderNameEl=document.createElement("div")
			folderNameEl.className="entryname"
			folderNameEl.append(i)
			let folderContentEl=document.createElement("div")
			folderContentEl.style.paddingLeft="10px"
			folderNameEl.addEventListener("click",e=>{
				if(fileEl.getAttribute("data-expanded")==null){
					fileEl.setAttribute("data-expanded","")
					expandFolder(folderContentEl,dir+"/"+i)
				}else{
					fileEl.removeAttribute("data-expanded");
					[...folderContentEl.children].forEach(a=>a.remove())
				}
			})
			fileEl.append(folderNameEl,folderContentEl)
		}else{
			fileEl.append(i)
			fileEl.addEventListener("click",e=>{
				if(e.shiftKey)previewDir="./test"+dir+"/"+i
				openFile(dir+"/"+i)
			})
		}
		el.append(fileEl)
	}
}

displaySource.addEventListener("change",e=>{
	document.getElementById("frame").contentWindow.location="test"+e.target.value
})

expandFolder(document.getElementById("fileview"),"")

navigator.serviceWorker.register("worker.js")
