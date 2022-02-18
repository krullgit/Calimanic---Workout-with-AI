/**
 * This file is loaded into the index.html
 * 
 * Authors: Matthes Krull
 */

const databaseQueryID = async () => {
    const body = {
        "opponents": OX.value.trim() + "," + OY.value.trim(),
        "opponentsreps":"-1,-1",
        "challengetype":challengetype.value.trim(),
        "challengereps":challengereps.value.trim()
    };
    try {
        const res = await fetch('/.netlify/functions/createLinks', {
            method: 'POST',
            body: JSON.stringify(body),
        });
        const links = await res.json();
        let id = String(links._id)
        return [id]
    } catch (error) {
        console.log("WARNING: Fallback to the default game!")
    }
};

const OX = document.getElementById('OX');
const OY = document.getElementById('OY');
const challengetype = document.getElementById('challengetype');
const challengereps = document.getElementById('challengereps');
const rules = document.getElementById('rules');

function logSubmit(event) {
    event.preventDefault();
    document.getElementById("new").style.display = 'none';new_created
    document.getElementById("new_title").innerHTML = "HOLD!"
    document.getElementById("spinner").style.display = 'block';
    document.getElementById("new_created").style.display = 'block';
    databaseQueryID().then((messages) => {
        let id = messages[0]
        var base_url = window.location.origin;
        let link = base_url+"/camera.html?id="+id
        document.getElementById("new_title").innerHTML = "DONE!"
        document.getElementById("new_created_link").innerHTML = link
        document.getElementById("new_created_link").href = link
        document.getElementById("new_created_link").style.fontFamily = "Holtwood One SC"
        document.getElementById("spinner").style.display = 'none';
        document.getElementById("new_created_message").style.display = 'block';
        document.getElementById("new_created_link").style.display = 'block';
        document.getElementById("img_whatsapp").style.display = 'block';
        document.getElementById("img_telegram").style.display = 'block';
        document.getElementById("img_copy").style.display = 'block';
        let button_whatsapp = document.getElementById("img_whatsapp")
        let button_telegram = document.getElementById("img_telegram")
        let button_copy = document.getElementById("img_copy")
        button_whatsapp.onclick = function() {
            window.location.href = "whatsapp://send?text=dummy".replace("dummy",link);
        }
        button_telegram.onclick = function() {
            window.location.href = "https://t.me/share/url?url={dummy}&text={Pumping Time :D}".replace("dummy",link);
        }
        button_copy.onclick = function() {
            var copyText = document.querySelector("#new_created_link").textContent;
            navigator.clipboard.writeText(copyText).then(function() {
                /* Alert the copied text */
                alert("Copied!");
            }, function() {
                /* clipboard write failed */
                alert("Copy failed :(");
            });
        }
    });
}

const form = document.getElementById('form');
form.addEventListener('submit', logSubmit);

// ------------------------------------------------------------------------------------------------------
// wait if the server responded the challnge details
// ------------------------------------------------------------------------------------------------------

