
var worker=null
navigator.serviceWorker.getRegistration().then(a=>{
	worker=a.active

})




async function openFile(path){
	document.getElementById("fs").value=path
	let file=await getFile(path)
	if(!file||file.type=="folder")return


	document.getElementById("frame").src="./test/firstdir.html"


	document.getElementById("ta").value=await file.content.text()



}

document.getElementById("fs").addEventListener("change",a=>{
	openFile(a.target.value)
})


document.getElementById("save").addEventListener("click",async a=>{

	updateFile(document.getElementById("fs").value,document.getElementById("ta").value)
	document.getElementById("frame").contentWindow.location.reload()




})

async function expandFolder(el,dir){
	let folder=await getFile(dir)
	for(let i in folder.content){
		let fileEl=document.createElement("div")
		if(folder.content[i].type=="directory"){
			let folderNameEl=document.createElement("div")
			folderNameEl.append(i)
			let folderContentEl=document.createElement("div")
			folderContentEl.style.paddingLeft="10px"
			folderNameEl.addEventListener("click",a=>{
				expandFolder(folderContentEl,dir+"/"+i)
			})
			fileEl.append(folderNameEl,folderContentEl)
		}else{
			fileEl.append(i)
			fileEl.addEventListener("click",a=>{
				openFile(dir+"/"+i)
			})
		}
		el.append(fileEl)
	}
}

expandFolder(document.getElementById("fileview"),"")

navigator.serviceWorker.register("worker.js")
