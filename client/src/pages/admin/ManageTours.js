import { useEffect, useState } from 'react';
import api from '../../utils/axiosConfig';
import Alert from '../../components/Alert/Alert';
import Button from '../../components/Button/Button';

const ManageTours = () => {
  const [tours, setTours] = useState({});
  const [loading, setLoading] = useState(true);
  const [showPopUp, setShowPopUp] = useState(false);
  const [tourId, setTourId] = useState(null);
  const [tourName, setTourName] = useState(null);
  const [message, setMessage] = useState(null);
  const [status, setStatus] = useState('confirmation');

  const popupHandler = (id, name) => {
    setTourId(id);
    setTourName(name);
    setShowPopUp(true);
  };

  const deleteTour = (id) => {
    api
      .delete(`tours/${id}`)
      .then((res) => {
        // console.log(res);
        if (res.status === 204) {
          setMessage(`${tourName} successfully deleted`);
          setStatus('success');
          setLoading(true);

          setTimeout(() => {
            setMessage(null);
            setStatus('confirmation');
            setShowPopUp(false);
            setLoading(false);
          }, 1500);
        }
      })
      .catch((err) => {
        console.error(err);
        setMessage('Ops! Something went wrong, please try again.');
        setStatus('error');

        setTimeout(() => {
          setMessage(null);
          setStatus('confirmation');
          setShowPopUp(false);
        }, 1500);
      });
  };

  const closePopup = () => {
    setShowPopUp(false);
  };

  useEffect(() => {
    if (loading) {
      api
        .get('tours')
        .then((res) => {
          // console.log(res);
          setTours(res.data.data.data);
        })
        .then(() => setLoading(false))
        .catch((err) => {
          console.log(err);
        });
    }
  }, [loading]);

  return (
    <div className="content">
      <h2 className="heading-secondary">Manage Tours</h2>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <ul className="content__list ma-top-md">
          {tours.map((tour, index) => (
            <li className="content__list--item" key={index}>
              <span>
                <strong>{tour.name}</strong> |{' '}
                <Button
                  type="link"
                  color="green"
                  to={`/edit-tour/${tour.id}`}
                  value="Edit"
                />{' '}
                or{' '}
                <Button
                  type="link"
                  onClick={() => popupHandler(tour.id, tour.name)}
                  color="red"
                  to="#"
                  value="Delete"
                />
              </span>
              <p>{tour.summary}</p>
            </li>
          ))}
          {showPopUp && (
            <Alert
              status={status}
              message={message ?? `Are you sure you want to delete ${tourName}?`}
              confirmHandler={() => deleteTour(tourId)}
              deniesHandler={closePopup}
            />
          )}
        </ul>
      )}
    </div>
  );
};

export default ManageTours;
