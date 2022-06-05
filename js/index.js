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


	document.getElementById("editor").value=await file.content.text()



}

document.getElementById("fs").addEventListener("change",e=>{
	openFile(e.target.value)
})

document.getElementById("folderCreate").addEventListener("click",a=>{
	files.createFolder(document.getElementById("folderLocation").value)
})


document.getElementById("editor").addEventListener("beforeinput",a=>{
	console.log(a.inputType)
	if(a.inputType=="insertLineBreak"){
		let lineStart=("\n"+a.target.value).slice(0,a.target.selectionStart).lastIndexOf("\n")

		let indent=a.target.value.slice(lineStart).match(/\s*/)[0]

		a.target.setRangeText("\n"+indent,a.target.selectionStart,a.target.selectionEnd,"end")
		a.preventDefault()
	}
})

async function save(e){

	files.updateFile(document.getElementById("fs").value,[document.getElementById("editor").value])
	document.getElementById("frame").contentWindow.location.reload()




}
document.getElementById("save").addEventListener("click",save)


async function expandFolder(el,dir){
	let folder=await files.getFile(dir)
	for(let i in folder.content){
		let fileEl=document.createElement("div")
		if(folder.content[i].type=="folder"){
			fileEl.className="folderentry closed"
			let folderNameEl=document.createElement("div")
			folderNameEl.className="entryname"
			folderNameEl.append(i)
			let folderContentEl=document.createElement("div")
			folderContentEl.style.paddingLeft="10px"
			folderNameEl.addEventListener("click",e=>{
				if(fileEl.classList.contains("closed")){
					fileEl.classList.remove("closed")
					fileEl.classList.add("open")
					let isInit=fileEl.classList.contains("initialised")
					if(!isInit){
						fileEl.classList.add("initialised")
						expandFolder(folderContentEl,dir+"/"+i)
					}else{
						folderContentEl.style.display="block"
					}
				}else{
					fileEl.classList.remove("open")
					fileEl.classList.add("closed");
					folderContentEl.style.display="none"
				}
			})
			fileEl.append(folderNameEl,folderContentEl)
		}else{
			fileEl.className="fileentry"
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
