import { useEffect, useState } from "react";
import '../styling/connect.css'

export default function Connect() {
  const [instances, setInstances] = useState([]);
  const [qrCode, setQRCode] = useState('');
  const [showNumbers,setShowNumbers] = useState(false);

  const getAuthStatus = async () => {
      try {
        for(let i=0; i<instances.length; i++){
          if(instances[i].status == 'notAuthorized'){
            fetchQR(instances[i].apiUrl,instances[i].idInstance,instances[i].apiTokenInstance)
            // console.log('id',instances[i].apiUrl,instances[i].idInstance,instances[i].apiTokenInstance);
            break;
          }
        }
        
        
      } catch (error) {
        console.error('Error getting QR code:', error);
      }
  };
   
  const fetchQR = async (url,id,token)=>{
    try {
      const response = await fetch('/api/qr',{
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url,id,token })
      });
      const data = await response.json();
      if(data?.qrData.type == 'qrCode'){
        setQRCode(`data:image/png;base64,${data.qrData.message}`);
      }
      console.log('qr',data);
      
    } catch (error) {
      console.error('Error fetching QR code:', error);
    }
     
  }

  const fetchInstances = async () => {
    try {
      const response = await fetch('/api/gteInstances');
      if (!response) {
        console.log('no instances');
      }
      const responsedata = await response.json();
      setInstances(responsedata.instances);
      console.log('instances:',responsedata.instances);
      
    } catch (error) {
      console.error('Error getting QR code:', error);
    }
};

useEffect(()=>{
   fetchInstances();
},[]);

useEffect(()=>{
  getAuthStatus();
},[instances]);

const handleNumbers = () =>{
  setShowNumbers(true);
  console.log('number');
}

const handleWhatsappAcount =(id,url,token,phone)=>{
  console.log('id',id,url,token,phone);
  
}
  

  return (
    <div style={{display:'flex',justifyContent:'center'}}>
      <div className="main-container">
        <div className="main-heading"><p>Let's Connect</p></div>
        <div className="connect-container">
          <div className="qr-code-section">
            <div><p style={{fontWeight:'bold'}}>Scan the Qr-code to present the dialogs on your own device. </p></div>
            <div>
              {qrCode && <img src={qrCode} alt="QR Code" />}
            </div>
          </div>

          <div className="vertical-line"></div>

          <div className="get-number-section">
            <div>
              {showNumbers ?(
                <p style={{fontWeight:'bold'}}>Choose a Number</p>
              ):(
                <p style={{fontWeight:'bold'}}>Get a new number for your store</p>
              )}
            </div>
            <div className="get-number-div">
                
                
                {showNumbers ? (
                    <ul className="contact-list">
                      {instances
                        .filter(instance => instance.status === 'notAuthorized')
                        .map(instance => (
                          <li
                            className="contact-item"
                            onClick={() => { handleWhatsappAcount(instance.idInstance, instance.apiUrl, instance.apiTokenInstance, instance.phone); }}
                            key={instance.idInstance}
                          >
                            <div>{instance.idInstance}</div>
                          </li>
                        ))
                      }
                    </ul>
                  ):(
                    <button className="get-number-button" onClick={handleNumbers}>Get New Number</button>
                  )}

                
            </div>
          </div>
        </div>
      </div>
    </div>

  );
}
