import React, { useContext } from "react";
import { CartContext } from "../../../../../context/cartContext";
import CrossIcon from "../../../../shared/svg/cross-icon";
import cartItemStyles from "../../../../../styles/products/cartItemsOrderSummary.module.scss";
import { ONDC_COLORS } from "../../../../shared/colors";
import ProductCard from "../../product-card/productCard";

export default function CartItems(props) {
  const { onClose } = props;
  const { cartItems, onRemoveProduct } = useContext(CartContext);
  return (
    <div className={cartItemStyles.cart_items_order_summary_wrapper}>
      <div className="container">
        <div className="row">
          <div className="d-flex align-items-center py-3">
            <p className={cartItemStyles.label}>Cart</p>
            <div className="ms-auto">
              <CrossIcon
                width="25"
                height="25"
                style={{ cursor: "pointer" }}
                color={ONDC_COLORS.SECONDARYCOLOR}
                onClick={onClose}
              />
            </div>
          </div>
        </div>
        <div className={`row pb-3 ${cartItemStyles.items_wrapper}`}>
          {cartItems.map(({ product, id, bpp_id, provider }) => {
            return (
              <div className="col-lg-4 col-md-6 col-sm-6 p-2" key={id}>
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      position: "absolute",
                      top: "5px",
                      right: "5px",
                      cursor: "pointer",
                    }}
                    onClick={() => onRemoveProduct(id)}
                  >
                    <CrossIcon
                      width="20"
                      height="20"
                      color={ONDC_COLORS.SECONDARYCOLOR}
                    />
                  </div>
                  <ProductCard
                    product={product}
                    bpp_id={bpp_id}
                    location_id={provider?.locations[0]}
                    bpp_provider_id={provider?.id}
                    bpp_provider_descriptor={{ name: provider?.name }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
