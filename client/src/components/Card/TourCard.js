import { Link } from 'react-router-dom';
import { getClosestDate } from '../../helper/functions';
import { IoFlagOutline } from 'react-icons/io5';
import Calendar from '../Icons/Calendar';
import Location from '../Icons/Location';
import User from '../Icons/User';

const TourCard = ({ tours }) => {
  return (
    <div className="card-container">
      {tours.map((tour, index) => (
        <div key={index} className="card">
          <div className="card__header">
            <div className="card__picture">
              <div className="card__picture-overlay">&nbsp;</div>
              <img
                src={`https://natours-app-r8rd.onrender.com/public/img/tours/${tour.imageCover}`}
                alt="Tour cover"
                className="card__picture-img"
                crossOrigin="anonymous"
              />
            </div>

            <h3 className="card__heading heading-tertirary">
              <span>{tour.name}</span>
            </h3>
          </div>

          <div className="card__details">
            <h4 className="card__sub-heading">
              {tour.difficulty} {tour.duration}-day tour
            </h4>
            <p className="card__summary">{tour.summary}.</p>
            <div className="card__data">
              <Location className="card__icon" />
              <span>{tour.startLocation.description}</span>
            </div>
            <div className="card__data">
              <Calendar className="card__icon" />
              <span>{getClosestDate(tour.startDates)}</span>
            </div>
            <div className="card__data">
              <IoFlagOutline className="card__icon" />
              <span>{tour.locations.length} stops</span>
            </div>
            <div className="card__data">
              <User className="card__icon" />
              <span>{tour.maxGroupSize} people</span>
            </div>
          </div>

          <div className="card__footer">
            <p>
              <span className="card__footer-value">${tour.price} </span>
              <span className="card__footer-text">per person</span>
            </p>
            <p className="card__ratings">
              <span className="card__footer-value">{tour.ratingsAverage}</span>
              <span className="card__footer-text">
                {' '}
                rating ({tour.ratingsQuantity})
              </span>
            </p>
            <Link to={`/tour/${tour.id}`} className="btn btn--green btn--small">
              Details
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TourCard;
