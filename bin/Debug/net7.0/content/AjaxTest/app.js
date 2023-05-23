
function SendAjaxRequest() {

    var httpRequest;
    if (window.XMLHttpRequest) {
        httpRequest = new XMLHttpRequest();

    } else if (window.ActiveXObject) {
        httpRequest = new ActiveXObject("Microsoft.XMLHTTP");
    }

    var requestURl = 'ajaxtest.json';
    httpRequest.open('GET', requestURl);

    httpRequest.onload = () => {
        if (httpRequest.status != 200) {
            console.log('error>>>>>>>>>');
            return;
        }
        var request = JSON.parse(httpRequest.response);
        console.log(request.phrase);
    };
    httpRequest.send();
}
