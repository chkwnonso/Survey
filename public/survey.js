const API_URL = "http://localhost:3000/api/submit";

document.getElementById("surveyForm").addEventListener("submit", async (e) => {

e.preventDefault();

const entry = {
age: document.getElementById("age").value,
gender: document.getElementById("gender").value,
course: document.getElementById("course").value,
timestamp: new Date().toISOString()
};

try{

await fetch(API_URL,{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify(entry)
});

document.getElementById("status").innerText="Submitted successfully ✅";

}catch(err){

localStorage.setItem("offlineSurvey",JSON.stringify(entry));
document.getElementById("status").innerText="Saved offline 📱";

}

});