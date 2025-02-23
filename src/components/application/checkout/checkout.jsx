import React, {
  Fragment,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  useHistory,
  useLocation,
} from "react-router-dom/cjs/react-router-dom.min";
import Navbar from "../../shared/navbar/navbar";
import { CartContext } from "../../../context/cartContext";
import styles from "../../../styles/cart/cartView.module.scss";
import { buttonTypes } from "../../../utils/button";
import Button from "../../shared/button/button";
import { ONDC_COLORS } from "../../shared/colors";
import no_result_empty_illustration from "../../../assets/images/empty-state-illustration.svg";
import Cookies from "js-cookie";
import { getCall, postCall } from "../../../api/axios";
import { constructQouteObject } from "../../../utils/constructRequestObject";
import Loading from "../../shared/loading/loading";
import PriceDetailsCard from "./price-details-card/priceDetailsCard";
import AddressDetailsCard from "./address-details/addressDetailsCard";
import OrderConfirmationCard from "./order-confirmation/orderConfirmationCard";
import PaymentConfirmationCard from "./payment-method/paymentConfirmationCard";
import {
  checkout_steps,
  get_current_step,
} from "../../../constants/checkout-steps";
import Toast from "../../shared/toast/toast";
import { toast_types } from "../../../utils/toast";

export default function Checkout() {
  const location = useLocation();
  const { cartItems } = useContext(CartContext);
  const [orderStatus, setOrderStatus] = useState("");
  const transaction_id = Cookies.get("transaction_id");
  const history = useHistory();
  const [getQuoteLoading, setGetQuoteLoading] = useState(true);
  const [initLoading, setInitLoading] = useState(false);
  const [productsQuote, setProductsQoute] = useState();
  const [currentActiveStep, setCurrentActiveStep] = useState(
    get_current_step(checkout_steps.SELECT_ADDRESS)
  );
  const [toast, setToast] = useState({
    toggle: false,
    type: "",
    message: "",
  });
  const quote_polling_timer = useRef(0);

  // use this effect to handle callback from justpay
  useEffect(() => {
    if (location?.search) {
      let searchParams = new URLSearchParams(location.search);
      setOrderStatus(searchParams.get("status"));
      setCurrentActiveStep(
        get_current_step(checkout_steps.SELECT_PAYMENT_METHOD)
      );
      setGetQuoteLoading(false);
    }
  }, [location]);

  useEffect(() => {
    // use this function to get the quote of the items
    async function getQuote(items) {
      try {
        const data = await postCall(
          "/client/v2/get_quote",
          items.map((item) => ({
            context: {
              transaction_id,
            },
            message: {
              cart: {
                items: item,
              },
            },
          }))
        );
        const array_of_ids = data.map((d) => {
          if (d.error) {
            return {
              error_reason: d.error.message,
              message_id: d.context.message_id,
            };
          }
          return {
            error_reason: "",
            message_id: d.context.message_id,
          };
        });
        // check here if the response returned error or not
        const isContainingError = array_of_ids.find(
          (idObj) => idObj.error_reason !== ""
        );

        // If error than show toast
        if (isContainingError) {
          setToast((toast) => ({
            ...toast,
            toggle: true,
            type: toast_types.error,
            message: isContainingError.error_reason,
          }));
          if (
            array_of_ids.filter((idObj) => idObj.error_reason === "").length <=
            0
          ) {
            setGetQuoteLoading(false);
          }
        }
        callApiMultipleTimes(
          array_of_ids.filter((idObj) => idObj.error_reason === "")
        );
      } catch (err) {
        setToast((toast) => ({
          ...toast,
          toggle: true,
          type: toast_types.error,
          message: err.response.data.error,
        }));
        setGetQuoteLoading(false);
      }
    }

    // this check is so that when cart is empty we do not call the
    // and when the payment is not maid
    if (cartItems.length > 0 && orderStatus === "") {
      const request_object = constructQouteObject(cartItems);
      getQuote(request_object);
    }

    // cleanup function
    return () => {
      clearInterval(quote_polling_timer.current);
    };
    // eslint-disable-next-line
  }, [cartItems, transaction_id]);

  // on get quote Api
  async function onGetQuote(array_of_ids) {
    try {
      const data = await getCall(
        `/client/v2/on_get_quote?messageIds=${array_of_ids
          .filter((txn) => txn.error_reason === "")
          .map((txn) => txn.message_id)}`
      );
      let total_payable = 0;
      const quotes = data.map((item) => {
        const { message } = item;
        total_payable += Number(message?.quote?.quote?.price?.value);
        const breakup = message?.quote?.quote?.breakup;
        const provided_by = message?.quote?.provider?.descriptor?.name;
        const product = breakup.map((break_up_item) => ({
          title: break_up_item?.title,
          price: Math.round(break_up_item?.price?.value),
          provided_by,
        }));
        return product;
      });
      setProductsQoute({ products: quotes.flat(), total_payable });
    } catch (err) {
      setToast((toast) => ({
        ...toast,
        toggle: true,
        type: toast_types.error,
        message: err.response.data.error,
      }));
      clearInterval(quote_polling_timer.current);
      setGetQuoteLoading(false);
    }
  }

  // use this function to call on get quote call multiple times
  function callApiMultipleTimes(message_ids) {
    let counter = 6;
    quote_polling_timer.current = setInterval(async () => {
      if (counter <= 0) {
        setGetQuoteLoading(false);
        clearInterval(quote_polling_timer.current);
        return;
      }
      await onGetQuote(message_ids).finally(() => {
        counter -= 1;
      });
    }, 2000);
  }

  const loadingSpin = (
    <div
      className={`${styles.playground_height} d-flex align-items-center justify-content-center`}
    >
      <Loading backgroundColor={ONDC_COLORS.ACCENTCOLOR} />
    </div>
  );

  const empty_cart_state = (
    <div
      className={`${styles.playground_height} d-flex align-items-center justify-content-center`}
    >
      <div className="text-center">
        <div className="py-2">
          <img
            src={no_result_empty_illustration}
            alt="empty_search"
            style={{ height: "130px" }}
          />
        </div>
        <div className="py-2">
          <p className={styles.illustration_header}>Your cart is empty</p>
          <p className={styles.illustration_body}>
            looks like your shopping cart is empty, you can shop now by clicking
            button below
          </p>
        </div>
        <div className="py-3">
          <Button
            button_type={buttonTypes.primary}
            button_hover_type={buttonTypes.primary_hover}
            button_text="Shop now"
            onClick={() => history.push("/application/")}
          />
        </div>
      </div>
    </div>
  );
  return (
    <Fragment>
      <Navbar />
      {toast.toggle && (
        <Toast
          type={toast.type}
          message={toast.message}
          onRemove={() =>
            setToast((toast) => ({
              ...toast,
              toggle: false,
            }))
          }
        />
      )}
      {cartItems.length <= 0 && orderStatus === "" ? (
        empty_cart_state
      ) : getQuoteLoading ? (
        loadingSpin
      ) : (
        <div className={styles.playground_height}>
          <div className="container">
            <div className="row py-3">
              <div className="col-12">
                <p className={styles.cart_label}>Checkout</p>
              </div>
            </div>
            <div className="row py-2">
              <div className="col-lg-8">
                <div className="container-fluid p-0">
                  <div className="row">
                    <div className="col-12 pb-3">
                      <AddressDetailsCard
                        currentActiveStep={currentActiveStep}
                        setCurrentActiveStep={(value) =>
                          setCurrentActiveStep(value)
                        }
                        initLoading={initLoading}
                      />
                    </div>
                    <div className="col-12 pb-3">
                      <OrderConfirmationCard
                        currentActiveStep={currentActiveStep}
                        setCurrentActiveStep={(value) =>
                          setCurrentActiveStep(value)
                        }
                        updateInitLoading={(value) => setInitLoading(value)}
                      />
                    </div>
                    <div className="col-12 pb-3">
                      <PaymentConfirmationCard
                        currentActiveStep={currentActiveStep}
                        productsQuote={productsQuote}
                        orderStatus={orderStatus}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-lg-4">
                <div className="container-fluid p-0">
                  <div className="row">
                    <div className="col-12">
                      <PriceDetailsCard productsQuote={productsQuote} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
}
