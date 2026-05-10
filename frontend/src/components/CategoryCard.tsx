import React from 'react'
import { Link } from 'react-router-dom'

interface CategoryCardProps {
  category: string
  image?: string
  className?: string
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ category, image, className = '' }) => {
  const isToyCategory = category === 'Toys & Games'
  const isMusicCategory = category === 'Music'
  const isClothingCategory = category === 'Clothing'
  const isElectronicsCategory = category === 'Electronics'
  const isSportsCategory = category === 'Sports & Outdoors'
  const isFoodCategory = category === 'Food & Beverages' || category === 'Food & Drink'
  const isGardenCategory = category === 'Garden'
  const isBookCategory = category === 'Books'
  const isHomeCategory = category === 'Home & Kitchen'
  const isOfficeCategory = category === 'Office Supplies'

  if (isToyCategory) {
    // ... (rest of toy logic)
    return (
      <Link
        to={`/browse?category=${encodeURIComponent(category)}`}
        className={`toy-category-card relative group overflow-hidden rounded-[3rem] w-full h-full block transition-all duration-500 border-[3px] border-black bg-[#fdd835] ${className}`}
      >
        {/* Content */}
        <div className="relative h-full flex items-center justify-center p-8 text-center z-10 gap-6">
          <div className="toy-card-svg-container transition-all duration-500 group-hover:scale-[3] group-hover:translate-x-[20%]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 36 36"
              width="80px"
              height="80px"
              className="sm:w-[120px] sm:h-[120px]"
            >
              <rect width="36" height="36" x="0" y="0" fill="#fdd835"></rect>
              <path
                fill="#e53935"
                d="M38.67,42H11.52C11.27,40.62,11,38.57,11,36c0-5,0-11,0-11s1.44-7.39,3.22-9.59 c1.67-2.06,2.76-3.48,6.78-4.41c3-0.7,7.13-0.23,9,1c2.15,1.42,3.37,6.67,3.81,11.29c1.49-0.3,5.21,0.2,5.5,1.28 C40.89,30.29,39.48,38.31,38.67,42z"
              ></path>
              <path
                fill="#b71c1c"
                d="M39.02,42H11.99c-0.22-2.67-0.48-7.05-0.49-12.72c0.83,4.18,1.63,9.59,6.98,9.79 c3.48,0.12,8.27,0.55,9.83-2.45c1.57-3,3.72-8.95,3.51-15.62c-0.19-5.84-1.75-8.2-2.13-8.7c0.59,0.66,3.74,4.49,4.01,11.7 c0.03,0.83,0.06,1.72,0.08,2.66c4.21-0.15,5.93,1.5,6.07,2.35C40.68,33.85,39.8,38.9,39.02,42z"
              ></path>
              <path
                fill="#212121"
                d="M35,27.17c0,3.67-0.28,11.2-0.42,14.83h-2C32.72,38.42,33,30.83,33,27.17 c0-5.54-1.46-12.65-3.55-14.02c-1.65-1.08-5.49-1.48-8.23-0.85c-3.62,0.83-4.57,1.99-6.14,3.92L15,16.32 c-1.31,1.6-2.59,6.92-3,8.96v10.8c0,2.58,0.28,4.61,0.54,5.92H10.5c-0.25-1.41-0.5-3.42-0.5-5.92l0.02-11.09 c0.15-0.77,1.55-7.63,3.43-9.94l0.08-0.09c1.65-2.03,2.96-3.63,7.25-4.61c3.28-0.76,7.67-0.25,9.77,1.13 C33.79,13.6,35,22.23,35,27.17z"
              ></path>
              <path
                fill="#01579b"
                d="M17.165,17.283c5.217-0.055,9.391,0.283,9,6.011c-0.391,5.728-8.478,5.533-9.391,5.337 c-0.913-0.196-7.826-0.043-7.696-5.337C9.209,18,13.645,17.32,17.165,17.283z"
              ></path>
              <path
                fill="#212121"
                d="M40.739,37.38c-0.28,1.99-0.69,3.53-1.22,4.62h-2.43c0.25-0.19,1.13-1.11,1.67-4.9 c0.57-4-0.23-11.79-0.93-12.78c-0.4-0.4-2.63-0.8-4.37-0.89l0.1-1.99c1.04,0.05,4.53,0.31,5.71,1.49 C40.689,24.36,41.289,33.53,40.739,37.38z"
              ></path>
              <path
                fill="#81d4fa"
                d="M10.154,20.201c0.261,2.059-0.196,3.351,2.543,3.546s8.076,1.022,9.402-0.554 c1.326-1.576,1.75-4.365-0.891-5.267C19.336,17.287,12.959,16.251,10.154,20.201z"
              ></path>
              <path
                fill="#212121"
                d="M17.615,29.677c-0.502,0-0.873-0.03-1.052-0.069c-0.086-0.019-0.236-0.035-0.434-0.06 c-5.344-0.679-8.053-2.784-8.052-6.255c0.001-2.698,1.17-7.238,8.986-7.32l0.181-0.002c3.444-0.038,6.414-0.068,8.272,1.818 c1.173,1.191,1.712,3,1.647,5.53c-0.044,1.688-0.785,3.147-2.144,4.217C22.785,29.296,19.388,29.677,17.615,29.677z M17.086,17.973 c-7.006,0.074-7.008,4.023-7.008,5.321c-0.001,3.109,3.598,3.926,6.305,4.27c0.273,0.035,0.48,0.063,0.601,0.089 c0.563,0.101,4.68,0.035,6.855-1.732c0.865-0.702,1.299-1.57,1.326-2.653c0.051-1.958-0.301-3.291-1.073-4.075 c-1.262-1.281-3.834-1.255-6.825-1.222L17.086,17.973z"
              ></path>
              <path
                fill="#e1f5fe"
                d="M15.078,19.043c1.957-0.326,5.122-0.529,4.435,1.304c-0.489,1.304-7.185,2.185-7.185,0.652 C12.328,19.467,15.078,19.043,15.078,19.043z"
              ></path>
            </svg>
          </div>
          <div className="flex flex-col items-center overflow-hidden">
            <span className="text-white text-5xl sm:text-8xl font-black uppercase tracking-widest drop-shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all duration-500 group-hover:translate-x-[-100%]">
              {category}
            </span>
            <span className="absolute text-white text-6xl sm:text-9xl font-black uppercase tracking-widest drop-shadow-[4px_4px_0px_rgba(0,0,0,1)] translate-x-[200%] transition-all duration-500 group-hover:translate-x-0">
              PLAY NOW!
            </span>
          </div>
        </div>
      </Link>
    )
  }

  if (isMusicCategory) {
    return (
      <Link
        to={`/browse?category=${encodeURIComponent(category)}`}
        className={`music-category-card relative group overflow-hidden rounded-[3rem] w-full h-full block transition-all duration-500 ${className}`}
      >
        <div className="cassette-container">
          <div className="cassette">
            <div className="ups">
              <div className="screw">+</div>
              <div className="screw">+</div>
            </div>
            <div className="card1">
              <div className="line1"></div>
              <div className="line2"></div>
              <div className="yl">
                <div className="roll">
                  <div className="wheel"></div>
                  <div className="tape-window"></div>
                  <div className="wheel"></div>
                </div>
                <p className="num">90</p>
              </div>
              <div className="or">
                <p className="time">2×30min</p>
              </div>
            </div>
            <div className="card2_main">
              <div className="card2">
                <div className="deco-dot" style={{ left: '1.5em', top: '1.5em' }} />
                <div className="screw5">+</div>
                <div className="deco-dot" style={{ right: '1.5em', top: '1.5em' }} />
              </div>
            </div>
            <div className="downs">
              <div className="screw">+</div>
              <div className="screw">+</div>
            </div>
          </div>
          <div className="flex flex-col items-center mt-10 transition-all duration-500 group-hover:opacity-0 group-hover:translate-y-[20px]">
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-1">
              {category}
            </h2>
            <p className="text-white/60 text-sm font-bold uppercase tracking-widest">
              Explore Collection →
            </p>
          </div>
        </div>
      </Link>
    )
  }

  if (isClothingCategory) {
    return (
      <Link
        to={`/browse?category=${encodeURIComponent(category)}`}
        className={`clothing-category-card relative group overflow-hidden rounded-[3rem] w-full h-full block transition-all duration-500 ${className}`}
      >
        <div className="clothes-card-wrapper">
          <div className="clothes-card">
            <div className="card-img"><div className="clothes-img" /></div>
            <div className="clothes-title">CLOTHES</div>
            <div className="clothes-subtitle">Explore Collection →</div>
            <hr className="clothes-divider" />
            <div className="clothes-footer">
              <div className="card-price"><span>$</span> ???</div>
              <button className="clothes-btn">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="m397.78 316h-205.13a15 15 0 0 1 -14.65-11.67l-34.54-150.48a15 15 0 0 1 14.62-18.36h274.27a15 15 0 0 1 14.65 18.36l-34.6 150.48a15 15 0 0 1 -14.62 11.67zm-193.19-30h181.25l27.67-120.48h-236.6z"></path><path d="m222 450a57.48 57.48 0 1 1 57.48-57.48 57.54 57.54 0 0 1 -57.48 57.48zm0-84.95a27.48 27.48 0 1 0 27.48 27.47 27.5 27.5 0 0 0 -27.48-27.47z"></path><path d="m368.42 450a57.48 57.48 0 1 1 57.48-57.48 57.54 57.54 0 0 1 -57.48 57.48zm0-84.95a27.48 27.48 0 1 0 27.48 27.47 27.5 27.5 0 0 0 -27.48-27.47z"></path><path d="m158.08 165.49a15 15 0 0 1 -14.23-10.26l-25.71-77.23h-47.44a15 15 0 1 1 0-30h58.3a15 15 0 0 1 14.23 10.26l29.13 87.49a15 15 0 0 1 -14.23 19.74z"></path></svg>
              </button>
            </div>
          </div>
        </div>
      </Link>
    )
  }

  if (isElectronicsCategory) {
    return (
      <Link
        to={`/browse?category=${encodeURIComponent(category)}`}
        className={`electronics-category-card relative group overflow-hidden rounded-[3rem] w-full h-full block transition-all duration-500 ${className}`}
      >
        <div className="tv-wrapper">
          <div className="main">
            <div className="antenna">
              <div className="a1" />
              <div className="a2" />
            </div>
            <div className="tv">
              <div className="display_div">
                <div className="screen_out1">
                  <div className="screen">
                    <span className="notfound_text">ELECTRONICS</span>
                  </div>
                  <div className="screenM">
                    <span className="notfound_text">ELECTRONICS</span>
                  </div>
                </div>
              </div>
              <div className="buttons_div">
                <div className="b1">
                  <div />
                </div>
                <div className="b2" />
                <div className="speakers">
                  <div className="g" />
                  <div className="g" />
                  <div className="g" />
                </div>
              </div>
            </div>
            <div className="bottom">
              <div className="base" />
              <div className="base" />
            </div>
          </div>
          <div className="cta-text">Explore Collection →</div>
        </div>
      </Link>
    )
  }

  if (isSportsCategory) {
    return (
      <Link
        to={`/browse?category=${encodeURIComponent(category)}`}
        className={`sports-category-card relative group overflow-hidden rounded-[3rem] w-full h-full block transition-all duration-500 ${className}`}
      >
        <div className="field-wrapper">
          <div className="field-lines">
            <div className="center-line" />
            <div className="center-circle" />
          </div>
          <div className="sports-title">SPORTS</div>
          <div className="cta-text">Explore Collection →</div>
        </div>
      </Link>
    )
  }
  if (isFoodCategory) {
    return (
      <Link
        to={`/browse?category=${encodeURIComponent(category)}`}
        className={`food-category-card relative group flex items-center justify-center w-full h-full block transition-all duration-500 ${className}`}
      >
        <div className="pizza-container">
          <svg
            width="168"
            height="158"
            viewBox="0 0 168 158"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g id="pizza">
              <rect width="168" height="158" fill="none"></rect>
              <g id="slice6">
                <g id="slice">
                  <mask id="path-1-inside-1_7_2" fill="white">
                    <path
                      d="M110 34.8997C118.513 39.4198 125.582 45.921 130.497 53.75C135.412 61.579 138 70.4598 138 79.5L82 79.5L110 34.8997Z"
                    ></path>
                  </mask>
                  <path
                    d="M110 34.8997C118.513 39.4198 125.582 45.921 130.497 53.75C135.412 61.579 138 70.4598 138 79.5L82 79.5L110 34.8997Z"
                    fill="#FDDBA9"
                    stroke="#EE9758"
                    strokeWidth="2"
                    mask="url(#path-1-inside-1_7_2)"
                  ></path>
                </g>
                <g id="pepperoni">
                  <circle cx="114" cy="63" r="6" fill="#F12424"></circle>
                  <circle cx="114" cy="63" r="6" fill="#F12424"></circle>
                </g>
                <g id="mushroom">
                  <path
                    d="M96.3127 75.3748C93.8388 74.3499 93.5395 72.1249 96.4349 66.9246C100.861 64.107 105.48 66.5248 103.603 67.4062C101.726 68.2876 101.517 69.215 101.78 69.3984C101.78 69.3984 105.126 71.2856 104.991 72.8193C104.856 74.353 103.753 74.1725 103.409 74.5483C103.066 74.9242 99.9579 71.3905 99.9579 71.3905C96.0194 74.1256 98.7867 76.3997 96.3127 75.3748Z"
                    fill="#E3DDDD"
                  ></path>
                  <path
                    d="M99.9579 71.3905C99.9579 71.3905 103.066 74.9242 103.409 74.5483C103.753 74.1725 104.856 74.353 104.991 72.8193C105.126 71.2856 101.78 69.3984 101.78 69.3984M99.9579 71.3905L101.78 69.3984"
                    stroke="black"
                  ></path>
                </g>
                <path
                  id="onion"
                  d="M129.841 65.2587C127.54 64.2211 127.021 63.5697 127.016 62.3249C127.666 61.9214 128.094 61.8629 129.071 62.3249C130.14 62.8474 130.783 63.5952 131.961 65.2587C131.313 66.9451 130.895 67.8704 129.392 69.2403C131.161 70.4193 131.537 72.3751 131.961 72.3837C132.384 72.3923 129.231 76.9243 129.071 77.9719C127.662 78.0881 127.229 77.8597 127.016 76.994C126.863 74.9998 127.829 74.044 129.841 72.3837C128.109 71.4403 127.329 70.8249 127.016 69.2403C126.968 67.7728 127.329 66.9206 129.841 65.2587Z"
                  fill="#FFFBFB"
                  stroke="black"
                ></path>
                <path
                  id="pepper"
                  d="M121.34 55.4341C123.716 54.3509 124.645 54.4077 125.824 55.2995C125.811 56.107 125.607 56.4894 124.578 56.9337C123.436 57.4079 122.34 57.3806 120.055 57.1194C118.855 55.39 118.235 54.3915 117.853 52.2096C115.667 52.7671 113.592 51.6583 113.327 51.9889C113.062 52.3195 110.695 46.5489 109.803 45.6669C110.547 44.4628 111.025 44.2833 111.972 44.7368C113.948 46.0515 114.265 47.5081 114.612 50.3036C116.554 49.6053 117.608 49.4283 119.294 50.32C120.708 51.3389 121.295 52.2392 121.34 55.4341Z"
                  fill="#1EAA07"
                  stroke="#FDDBA9"
                ></path>
              </g>
              <g id="slice5">
                <g id="slice_2">
                  <mask id="path-7-inside-2_7_2" fill="white">
                    <path
                      d="M54 34.8997C62.5131 30.3796 72.1699 28 82 28C91.8301 28 101.487 30.3796 110 34.8997L82 79.5L54 34.8997Z"
                    ></path>
                  </mask>
                  <path
                    d="M54 34.8997C62.5131 30.3796 72.1699 28 82 28C91.8301 28 101.487 30.3796 110 34.8997L82 79.5L54 34.8997Z"
                    fill="#FDDBA9"
                    stroke="#EE9758"
                    strokeWidth="2"
                    mask="url(#path-7-inside-2_7_2)"
                  ></path>
                </g>
                <g id="pepperoni_2">
                  <circle cx="82" cy="56" r="6" fill="#F12424"></circle>
                  <circle cx="82" cy="56" r="6" fill="#F12424"></circle>
                </g>
                <g id="mushroom_2">
                  <path
                    d="M91.3127 43.3748C88.8388 42.3499 88.5395 40.1249 91.4349 34.9246C95.8614 32.107 100.48 34.5248 98.603 35.4062C96.7261 36.2876 96.5167 37.215 96.7805 37.3984C96.7805 37.3984 100.126 39.2856 99.9914 40.8193C99.8563 42.353 98.7534 42.1725 98.4095 42.5483C98.0656 42.9242 94.9579 39.3905 94.9579 39.3905C91.0194 42.1256 93.7867 44.3997 91.3127 43.3748Z"
                    fill="#E3DDDD"
                  ></path>
                  <path
                    d="M94.9579 39.3905C94.9579 39.3905 98.0656 42.9242 98.4095 42.5483C98.7534 42.1725 99.8563 42.353 99.9914 40.8193C100.126 39.2856 96.7805 37.3984 96.7805 37.3984M94.9579 39.3905L96.7805 37.3984"
                    stroke="black"
                  ></path>
                </g>
                <path
                  id="pepper_2"
                  d="M92.1727 48.6661C93.9594 46.7623 94.8409 46.462 96.27 46.8398C96.5642 47.5919 96.5204 48.0231 95.7373 48.8247C94.8608 49.6968 93.8366 50.0874 91.6233 50.713C89.857 49.5684 88.9042 48.8801 87.7226 47.0063C85.9121 48.3518 83.5712 48.1136 83.4516 48.52C83.3319 48.9264 78.9513 44.4862 77.7915 44.0087C78.0235 42.6121 78.3975 42.2646 79.4458 42.3247C81.7725 42.7912 82.6182 44.0187 84.0009 46.473C85.5319 45.0901 86.4399 44.5264 88.3386 44.7112C90.034 45.1171 90.918 45.7276 92.1727 48.6661Z"
                  fill="#1EAA07"
                  stroke="#FDDBA9"
                ></path>
                <path
                  id="onion_2"
                  d="M70.8415 37.2587C68.5397 36.2211 68.0212 35.5697 68.0156 34.3249C68.6658 33.9214 69.0936 33.8629 70.0708 34.3249C71.1402 34.8474 71.783 35.5952 72.9609 37.2587C72.3132 38.9451 71.8954 39.8704 70.3919 41.2403C72.1607 42.4193 72.5374 44.3751 72.9609 44.3837C73.3844 44.3923 70.2313 48.9243 70.0708 49.9719C68.6618 50.0881 68.2293 49.8597 68.0156 48.994C67.8631 46.9998 68.8294 46.044 70.8415 44.3837C69.109 43.4403 68.3292 42.8249 68.0156 41.2403C67.9682 39.7728 68.3287 38.9206 70.8415 37.2587Z"
                  fill="#FFFBFB"
                  stroke="black"
                ></path>
              </g>
              <g id="slice1">
                <g id="slice_3">
                  <mask id="path-13-inside-3_7_2" fill="white">
                    <path
                      d="M138 79.5C138 88.5401 135.412 97.421 130.497 105.25C125.582 113.079 118.513 119.58 110 124.1L82 79.5H138Z"
                    ></path>
                  </mask>
                  <path
                    d="M138 79.5C138 88.5401 135.412 97.421 130.497 105.25C125.582 113.079 118.513 119.58 110 124.1L82 79.5H138Z"
                    fill="#FDDBA9"
                    stroke="#EE9758"
                    strokeWidth="2"
                    mask="url(#path-13-inside-3_7_2)"
                  ></path>
                </g>
                <g id="pepperoni_3">
                  <circle cx="119" cy="99" r="6" fill="#F12424"></circle>
                  <circle cx="119" cy="99" r="6" fill="#F12424"></circle>
                </g>
                <path
                  id="pepper_3"
                  d="M110.227 89.6851C111.587 87.456 112.388 86.9817 113.864 87.0589C114.306 87.7349 114.352 88.166 113.749 89.1109C113.07 90.1438 112.147 90.7358 110.109 91.8011C108.145 91.0423 107.072 90.5634 105.532 88.9712C104.035 90.6587 101.695 90.9046 101.661 91.3269C101.627 91.7492 96.4305 88.2994 95.1975 88.0694C95.1387 86.6549 95.4337 86.2382 96.4722 86.0825C98.8451 86.063 99.9241 87.0914 101.78 89.2108C102.995 87.5439 103.769 86.8063 105.665 86.5986C107.408 86.6489 108.398 87.0656 110.227 89.6851Z"
                  fill="#1EAA07"
                  stroke="#FDDBA9"
                ></path>
                <path
                  id="onion_3"
                  d="M108.882 106.032C106.425 106.612 105.617 106.411 104.854 105.427C105.124 104.711 105.427 104.404 106.484 104.175C107.65 103.938 108.615 104.139 110.563 104.741C111.077 106.473 111.309 107.461 110.951 109.463C113.072 109.321 114.563 110.642 114.904 110.391C115.245 110.14 115.505 115.655 116.016 116.583C114.97 117.534 114.488 117.616 113.791 117.06C112.455 115.571 112.639 114.225 113.223 111.682C111.274 111.99 110.281 111.977 109.067 110.911C108.135 109.776 107.902 108.881 108.882 106.032Z"
                  fill="#FFFBFB"
                  stroke="black"
                ></path>
              </g>
              <g id="slice2">
                <g id="slice_4">
                  <mask id="path-17-inside-4_7_2" fill="white">
                    <path
                      d="M110 124.1C101.487 128.62 91.8301 131 82 131C72.1699 131 62.5131 128.62 54 124.1L82 79.5L110 124.1Z"
                    ></path>
                  </mask>
                  <path
                    d="M110 124.1C101.487 128.62 91.8301 131 82 131C72.1699 131 62.5131 128.62 54 124.1L82 79.5L110 124.1Z"
                    fill="#FDDBA9"
                    stroke="#EE9758"
                    strokeWidth="2"
                    mask="url(#path-17-inside-4_7_2)"
                  ></path>
                </g>
                <g id="pepperoni_4">
                  <circle cx="78" cy="103" r="6" fill="#F12424"></circle>
                  <circle cx="78" cy="103" r="6" fill="#F12424"></circle>
                </g>
                <g id="mushroom_3">
                  <path
                    d="M86.3127 117.375C83.8388 116.35 83.5395 114.125 86.4349 108.925C90.8614 106.107 95.48 108.525 93.603 109.406C91.7261 110.288 91.5167 111.215 91.7805 111.398C91.7805 111.398 95.1264 113.286 94.9914 114.819C94.8563 116.353 93.7534 116.172 93.4095 116.548C93.0656 116.924 89.9579 113.391 89.9579 113.391C86.0194 116.126 88.7867 118.4 86.3127 117.375Z"
                    fill="#E3DDDD"
                  ></path>
                  <path
                    d="M89.9579 113.391C89.9579 113.391 93.0656 116.924 93.4095 116.548C93.7534 116.172 94.8563 116.35 94.9914 114.819C95.1264 113.286 91.7805 111.398 91.7805 111.398M89.9579 113.391L91.7805 111.398"
                    stroke="black"
                  ></path>
                </g>
                <path
                  id="pepper_4"
                  d="M78.1727 124.666C79.9594 122.762 80.8409 122.462 82.27 122.84C82.5642 123.592 82.5204 124.023 81.7373 124.825C80.8608 125.697 79.8366 126.087 77.6233 126.713C75.857 125.568 74.9042 124.88 73.7226 123.006C71.9121 124.352 69.5712 124.114 69.4516 124.52C69.3319 124.926 64.9513 120.486 63.7915 120.009C64.0235 118.612 64.3975 118.265 65.4458 118.325C67.7725 118.791 68.6182 120.019 70.0009 122.473C71.5319 121.09 72.4399 120.526 74.3386 120.711C76.034 121.117 76.918 121.728 78.1727 124.666Z"
                  fill="#1EAA07"
                  stroke="#FDDBA9"
                ></path>
                <path
                  id="onion_4"
                  d="M84.2386 90.8992C81.7811 91.4786 80.9731 91.2779 80.2103 90.2943C80.4801 89.5782 80.7837 89.2712 81.8401 89.0422C83.0065 88.805 83.9717 89.0064 85.9193 89.608C86.4331 91.3399 86.6654 92.3282 86.3078 94.3305C88.4286 94.1878 89.9189 95.5092 90.26 95.258C90.6011 95.0069 90.8618 100.522 91.3727 101.45C90.3261 102.401 89.844 102.483 89.1471 101.927C87.8112 100.438 87.9952 99.0916 88.5793 96.5492C86.6308 96.8566 85.6375 96.8437 84.4234 95.7782C83.4917 94.6433 83.2584 93.7479 84.2386 90.8992Z"
                  fill="#FFFBFB"
                  stroke="black"
                ></path>
              </g>
              <g id="slice4">
                <g id="slice_5">
                  <mask id="path-23-inside-5_7_2" fill="white">
                    <path
                      d="M26 79.5C26 70.4599 28.5876 61.579 33.5026 53.75C38.4176 45.921 45.4869 39.4198 54 34.8997L82 79.5L26 79.5Z"
                    ></path>
                  </mask>
                  <path
                    d="M26 79.5C26 70.4599 28.5876 61.579 33.5026 53.75C38.4176 45.921 45.4869 39.4198 54 34.8997L82 79.5L26 79.5Z"
                    fill="#FDDBA9"
                    stroke="#EE9758"
                    strokeWidth="2"
                    mask="url(#path-23-inside-5_7_2)"
                  ></path>
                </g>
                <g id="pepperoni_5">
                  <circle cx="64" cy="70" r="6" fill="#F12424"></circle>
                  <circle cx="64" cy="70" r="6" fill="#F12424"></circle>
                </g>
                <g id="mushroom_4">
                  <path
                    d="M43.3127 61.3748C40.8388 60.3499 40.5395 58.1249 43.4349 52.9246C47.8614 50.107 52.48 52.5248 50.603 53.4062C48.7261 54.2876 48.5167 55.215 48.7805 55.3984M46.9579 57.3905L48.7805 55.3984"
                    stroke="black"
                  ></path>
                </g>
                <path
                  id="pepper_5"
                  d="M57.8415 50.8697C55.5397 49.6375 55.0212 48.864 55.0156 47.3859C55.6658 46.9067 56.0936 46.8372 57.0708 47.3859C58.1402 48.0063 58.783 48.8943 59.9609 50.8697C59.3132 52.8724 58.8954 53.9711 57.3919 55.5979C59.1607 56.9979 59.5374 59.3204 59.9609 59.3306C60.3844 59.3409 57.2313 64.7227 57.0708 65.9666C55.6618 66.1046 55.2293 65.8334 55.0156 64.8053C54.8631 62.4372 55.8294 61.3022 57.8415 59.3306C56.109 58.2104 55.3292 57.4796 55.0156 55.5979C54.9682 53.8552 55.3287 52.8432 57.8415 50.8697Z"
                  fill="#1EAA07"
                  stroke="#FDDBA9"
                ></path>
                <path
                  id="onion_5"
                  d="M34.5084 66.9457C32.7549 68.7623 31.9667 69.0306 30.7931 68.6159C30.6326 67.8677 30.7219 67.4452 31.4866 66.6812C32.3393 65.8508 33.2601 65.4981 35.2235 64.9506C36.5925 66.1293 37.3225 66.8349 38.1047 68.7124C39.8113 67.4452 41.7796 67.7506 41.9306 67.3548C42.0816 66.959 45.2839 71.4564 46.2158 71.9611C45.8497 73.3266 45.4888 73.6567 44.6017 73.5657C42.673 73.0364 42.0994 71.8042 41.2154 69.3499C39.7428 70.6625 38.9003 71.1888 37.3029 70.9494C35.9054 70.4988 35.2248 69.8719 34.5084 66.9457Z"
                  fill="#FFFBFB"
                  stroke="black"
                ></path>
              </g>
              <g id="slice3">
                <g id="slice_6">
                  <mask id="path-29-inside-6_7_2" fill="white">
                    <path
                      d="M54 124.1C45.4869 119.58 38.4176 113.079 33.5026 105.25C28.5876 97.421 26 88.5401 26 79.5L82 79.5L54 124.1Z"
                    ></path>
                  </mask>
                  <path
                    d="M54 124.1C45.4869 119.58 38.4176 113.079 33.5026 105.25C28.5876 97.421 26 88.5401 26 79.5L82 79.5L54 124.1Z"
                    fill="#FDDBA9"
                    stroke="#EE9758"
                    strokeWidth="2"
                    mask="url(#path-29-inside-6_7_2)"
                  ></path>
                </g>
                <g id="pepperoni_6">
                  <circle cx="42" cy="99" r="6" fill="#F12424"></circle>
                  <circle cx="42" cy="99" r="6" fill="#F12424"></circle>
                </g>
                <g id="mushroom_5">
                  <path
                    d="M57.3127 93.3748C54.8388 92.3499 54.5395 90.1249 57.4349 84.9246C61.8614 82.107 66.48 84.5248 64.603 85.4062C62.7261 86.2876 62.5167 87.215 62.7805 87.3984M60.9579 89.3905L62.7805 87.3984"
                    stroke="black"
                  ></path>
                </g>
                <path
                  id="pepper_6"
                  d="M45.1727 88.6661C46.9594 86.7623 47.8409 86.462 49.27 86.8398C49.5642 87.5919 49.5204 88.0231 48.7373 88.8247C47.8608 89.6968 46.8366 90.0874 44.6233 90.713C42.857 89.5684 41.9042 88.8801 40.7226 87.0063C38.9121 88.3518 36.5712 88.1136 36.4516 88.52C36.3319 88.9264 31.9513 84.4862 30.7915 84.0087C31.0235 82.6121 31.3975 82.2646 32.4458 82.3247C34.7725 82.7912 35.6182 84.0187 37.0009 86.473C38.5319 85.0901 39.4399 84.5264 41.3386 84.7112C43.034 85.1171 43.918 85.7276 45.1727 88.6661Z"
                  fill="#1EAA07"
                  stroke="#FDDBA9"
                ></path>
                <path
                  id="onion_6"
                  d="M53.4224 96.617C50.9625 96.0481 50.3269 95.5103 50.0787 94.2906C50.6377 93.7681 51.0459 93.6272 52.0944 93.8898C53.2452 94.1938 54.0214 94.8018 55.5011 96.2038C55.1947 97.9841 54.9652 98.9731 53.7578 100.61C55.7225 101.421 56.4733 103.266 56.8904 103.192C57.3074 103.118 55.0986 108.178 55.1454 109.236C53.7861 109.625 53.3173 109.486 52.9389 108.678C52.4005 106.752 53.1619 105.626 54.8116 103.605C52.9285 103.018 52.0437 102.566 51.4271 101.073C51.0944 99.6431 51.2818 98.737 53.4224 96.617Z"
                  fill="#FFFBFB"
                  stroke="black"
                ></path>
              </g>
            </g>
          </svg>
        </div>
      </Link>
    )
  }
  if (isGardenCategory) {
    return (
      <Link
        to={`/browse?category=${encodeURIComponent(category)}`}
        className={`garden-category-card relative group overflow-hidden rounded-[3rem] w-full h-full block transition-all duration-500 ${className}`}
      >
        <div className="garden-wrapper">
          <div className="garden-content">
            <div className="garden-title">GARDEN</div>
            <div className="cta-text text-white/80">Explore Collection →</div>
          </div>
        </div>
      </Link>
    )
  }

  if (isBookCategory) {
    return (
      <Link
        to={`/browse?category=${encodeURIComponent(category)}`}
        className={`book-category-card relative group overflow-hidden rounded-[3rem] w-full h-full block transition-all duration-500 ${className}`}
      >
        <div className="book-shelf-container">
          <div className="book-shelf-content relative h-full flex flex-col items-center justify-center z-20">
            <h2 className="book-title text-4xl sm:text-6xl font-bold text-white tracking-tight mb-4 drop-shadow-lg transition-transform duration-500 group-hover:scale-110">
              BOOKS
            </h2>
            <p className="book-cta text-white/60 text-lg sm:text-xl font-medium transition-all duration-500 group-hover:opacity-100 group-hover:translate-y-[-4px]">
              Explore Collection →
            </p>
          </div>
        </div>
      </Link>
    )
  }

  if (isHomeCategory) {
    return (
      <Link
        to={`/browse?category=${encodeURIComponent(category)}`}
        className={`home-kitchen-card relative group w-full h-full block transition-all duration-500 ${className}`}
      >
        <div className="spooky-house-container">
          <div className="content-circle">
            <div className="house">
              <div className="porch"></div>
              <div className="first-floor"></div>
              <div className="second-floor"></div>
              <div className="roof"></div>
              <div className="door"></div>
              <div className="small-windows"></div>
              <div className="big-window"></div>
              <div className="frames"></div>
            </div>
            <div className="moon"></div>
            <div className="rain">
              <div className="dropOne"></div>
              <div className="dropTwo"></div>
              <div className="dropThree"></div>
              <div className="dropFour"></div>
              <div className="dropFive"></div>
            </div>
          </div>
          <div className="home-content absolute inset-0 flex flex-col items-center justify-center z-20">
            <h2 className="text-4xl sm:text-6xl font-bold text-white tracking-tight mb-4 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] transition-transform duration-500 group-hover:scale-110">
              Home & Kitchen
            </h2>
            <p className="text-white/80 text-lg sm:text-xl font-medium transition-all duration-500 group-hover:opacity-100 group-hover:translate-y-[-4px]">
              Explore Collection →
            </p>
          </div>
        </div>
      </Link>
    )
  }

  if (isOfficeCategory) {
    return (
      <Link
        to={`/browse?category=${encodeURIComponent(category)}`}
        className={`office-supplies-card relative group overflow-hidden rounded-[3rem] w-full h-full block transition-all duration-500 ${className}`}
      >
        <div className="lamp-container">
          <div className="lamp">
            <div className="hat-thingy"></div>
            <div className="glass">
              <div className="glass-inside">
                <div className="boop blob"></div>
                <div className="boop blob"></div>
                <div className="boop blob"></div>
                <div className="boop blob"></div>
                <div className="boop blob"></div>
                <div className="boop blob"></div>
                <div className="boop blob"></div>
                <div className="boop blob-top"></div>
                <div className="boop blob-bottom"></div>
              </div>
            </div>
            <div className="base-one"></div>
            <div className="base-butt"></div>
            <div className="shadow"></div>
            <div className="the-actual-shadow"></div>
          </div>
          <div className="office-content absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
            <h2 className="text-4xl sm:text-6xl font-bold text-white tracking-tight mb-4 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] transition-transform duration-500 group-hover:scale-110">
              OFFICE
            </h2>
            <p className="text-white/80 text-lg sm:text-xl font-medium transition-all duration-500 group-hover:opacity-100 group-hover:translate-y-[-4px]">
              Explore Collection →
            </p>
          </div>
        </div>
      </Link>
    )
  }


  return (
    <Link
      to={`/browse?category=${encodeURIComponent(category)}`}
      className={`relative group overflow-hidden rounded-[3rem] w-full h-full block transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] ${className}`}
    >
      {/* Liquid Glass Background */}
      <div className="absolute inset-0 border border-white/30 bg-gradient-to-br from-white/40 to-gray-400/[0.24] backdrop-blur-[100px] shadow-[inset_0_2px_8px_rgba(255,255,255,0.7),_0_8px_32px_rgba(0,0,0,0.06)] group-hover:shadow-[inset_0_3px_12px_rgba(255,255,255,0.9),_0_12px_40px_rgba(0,0,0,0.11)] transition-all duration-500 rounded-[3rem]" />

      {/* Content */}
      <div className="relative h-full flex flex-col items-center justify-center p-8 text-center z-10">
        <h2 className="text-4xl sm:text-6xl font-bold text-[var(--text-color)] tracking-tight mb-4 drop-shadow-sm transition-transform duration-500 group-hover:scale-110">
          {category}
        </h2>
        <p className="text-[var(--text-color-secondary)] text-lg sm:text-xl font-medium opacity-80 transition-all duration-500 group-hover:opacity-100 group-hover:translate-y-[-4px]">
          Explore Collection →
        </p>
      </div>

      {/* Decorative inner light effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
    </Link>
  )
}
